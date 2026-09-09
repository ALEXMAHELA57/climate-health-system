from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import jwt
from passlib.context import CryptContext

from database import get_db, Admin
from app.routers.auth import JWT_SECRET, JWT_ALGO

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Set this on Render as a real secret, then use it once to create your first
# admin account via /api/admin-auth/bootstrap. After that first admin exists,
# the bootstrap endpoint refuses to create another one - normal login takes
# over from there.
ADMIN_BOOTSTRAP_KEY = os.getenv("ADMIN_BOOTSTRAP_KEY", "")

def create_admin_jwt(admin_id: int) -> str:
    payload = {"admin_id": admin_id, "type": "admin", "exp": datetime.utcnow() + timedelta(days=30), "iat": datetime.utcnow()}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_admin(authorization: str = Header(None), db: Session = Depends(get_db)) -> Admin:
    """Import and use this as a dependency on every admin-only endpoint
    across the app, e.g.: admin: Admin = Depends(get_current_admin)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin login required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Not an admin session")
    admin = db.query(Admin).filter(Admin.id == payload["admin_id"], Admin.active == True).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin account not found")
    return admin

class BootstrapIn(BaseModel):
    secret: str
    username: str
    password: str
    name: str = "Admin"

class LoginIn(BaseModel):
    username: str
    password: str

@router.post("/bootstrap")
def bootstrap_admin(data: BootstrapIn, db: Session = Depends(get_db)):
    if not ADMIN_BOOTSTRAP_KEY:
        return {"success": False, "error": "ADMIN_BOOTSTRAP_KEY is not set on the server"}
    if data.secret != ADMIN_BOOTSTRAP_KEY:
        raise HTTPException(status_code=403, detail="Incorrect bootstrap secret")
    if db.query(Admin).count() > 0:
        return {"success": False, "error": "An admin already exists - use /login instead"}
    admin = Admin(login_username=data.username, password_hash=pwd_context.hash(data.password), name=data.name, active=True)
    db.add(admin)
    db.commit()
    return {"success": True, "message": "First admin created - you can now log in"}

@router.post("/login")
def admin_login(data: LoginIn, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.login_username == data.username, Admin.active == True).first()
    if not admin or not pwd_context.verify(data.password, admin.password_hash):
        return {"success": False, "error": "Incorrect username or password"}
    return {"success": True, "token": create_admin_jwt(admin.id), "admin": {"id": admin.id, "name": admin.name}}

@router.get("/me")
def get_me(admin: Admin = Depends(get_current_admin)):
    return {"admin": {"id": admin.id, "name": admin.name, "login_username": admin.login_username}}
