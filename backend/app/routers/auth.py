from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
import random
import string
import os
import jwt
from passlib.context import CryptContext
from database import get_db, User, OTPCode, EmailVerificationToken

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-in-production-env-var")
JWT_ALGO = "HS256"
JWT_EXPIRY_DAYS = 90  # stay logged in like a normal mobile app

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://climate-health-system.vercel.app")

# ── Helpers ────────────────────────────────────────────────────────────────

def calculate_age(dob_str: str) -> int:
    dob = date.fromisoformat(dob_str)
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

def gen_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def gen_token() -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=48))

def create_jwt(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(User).filter(User.id == payload["user_id"], User.active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")
    return user

def user_public(u: User) -> dict:
    return {
        "id": u.id, "phone": u.phone, "email": u.email, "name": u.name,
        "date_of_birth": u.date_of_birth, "gender": u.gender, "language": u.language,
        "phone_verified": u.phone_verified, "email_verified": u.email_verified,
    }

async def send_otp_sms(phone: str, code: str):
    from sms import send_beem_sms, normalize_phone
    message = f"Your AfyaHewa verification code is {code}. It expires in 10 minutes."
    await send_beem_sms([{"recipient_id": "1", "dest_addr": normalize_phone(phone)}], message)

async def send_verification_email(email: str, token: str, lang: str = "en"):
    if not RESEND_API_KEY:
        print("[auth] RESEND_API_KEY not set - skipping email send (dev mode)")
        return
    import httpx
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify your AfyaHewa account" if lang == "en" else "Thibitisha akaunti yako ya AfyaHewa"
    body = (
        f"Welcome to AfyaHewa. Click the link below to verify your email:\n{verify_url}"
        if lang == "en" else
        f"Karibu AfyaHewa. Bofya kiungo hapa chini kuthibitisha barua pepe yako:\n{verify_url}"
    )
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": "AfyaHewa <noreply@afyahewa.com>", "to": [email], "subject": subject, "text": body},
        )
    print(f"[auth] Resend response status={res.status_code} body={res.text[:300]}")

# ── Request models ───────────────────────────────────────────────────────────

class PhoneStart(BaseModel):
    phone: str

class PhoneVerify(BaseModel):
    phone: str
    code: str

class ProfileComplete(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    name: str
    date_of_birth: str  # "YYYY-MM-DD"
    gender: str
    language: Optional[str] = "en"

class EmailRegister(BaseModel):
    email: EmailStr
    password: str
    language: Optional[str] = "en"

class EmailLogin(BaseModel):
    email: EmailStr
    password: str

# ── Phone + OTP flow ───────────────────────────────────────────────────────

@router.post("/phone/start")
async def phone_start(data: PhoneStart, db: Session = Depends(get_db)):
    """Used for both signup and login - same entry point, since we don't
    yet know if this phone has an account until they enter it."""
    code = gen_otp()
    db.add(OTPCode(phone=data.phone, code=code, purpose="login", expires_at=datetime.utcnow() + timedelta(minutes=10)))
    db.commit()
    await send_otp_sms(data.phone, code)
    return {"success": True, "message": "Verification code sent"}

@router.post("/phone/verify")
async def phone_verify(data: PhoneVerify, db: Session = Depends(get_db)):
    otp = db.query(OTPCode).filter(
        OTPCode.phone == data.phone, OTPCode.code == data.code, OTPCode.used == False,
    ).order_by(OTPCode.created_at.desc()).first()
    if not otp or otp.expires_at < datetime.utcnow():
        return {"success": False, "error": "Invalid or expired code"}
    otp.used = True
    db.commit()

    user = db.query(User).filter(User.phone == data.phone).first()
    if user:
        user.phone_verified = True
        db.commit()
        return {"success": True, "existing_user": True, "token": create_jwt(user.id), "user": user_public(user)}

    # New phone - needs profile completion (name, DOB, gender) before an account exists
    return {"success": True, "existing_user": False, "needs_profile": True}

@router.post("/phone/complete-profile")
def phone_complete_profile(data: ProfileComplete, db: Session = Depends(get_db)):
    return _complete_profile(data, db)

def _complete_profile(data: ProfileComplete, db: Session):
    age = calculate_age(data.date_of_birth)
    if age < 18:
        return {
            "success": False, "minor": True,
            "message": "Independent accounts are for users 18 and older. Please have a parent or guardian add this person under Family Health instead.",
        }
    user = User(
        phone=data.phone, email=data.email, name=data.name,
        date_of_birth=data.date_of_birth, gender=data.gender, language=data.language or "en",
        phone_verified=bool(data.phone), email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "token": create_jwt(user.id), "user": user_public(user)}

# ── Email + password flow ───────────────────────────────────────────────────

@router.post("/email/register")
async def email_register(data: EmailRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        return {"success": False, "error": "An account with this email already exists"}

    user = User(
        email=data.email, password_hash=pwd_context.hash(data.password),
        language=data.language or "en", email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = gen_token()
    db.add(EmailVerificationToken(email=data.email, token=token, purpose="verify", expires_at=datetime.utcnow() + timedelta(hours=24)))
    db.commit()
    await send_verification_email(data.email, token, data.language or "en")

    return {"success": True, "needs_profile": True, "needs_email_verification": True, "user_id": user.id}

@router.get("/email/verify")
def email_verify(token: str, db: Session = Depends(get_db)):
    record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token, EmailVerificationToken.used == False, EmailVerificationToken.purpose == "verify",
    ).first()
    if not record or record.expires_at < datetime.utcnow():
        return {"success": False, "error": "Invalid or expired verification link"}
    record.used = True
    user = db.query(User).filter(User.email == record.email).first()
    if user:
        user.email_verified = True
    db.commit()
    return {"success": True}

@router.post("/email/complete-profile")
def email_complete_profile(data: ProfileComplete, db: Session = Depends(get_db)):
    return _complete_profile(data, db)

@router.post("/email/login")
def email_login(data: EmailLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.password_hash or not pwd_context.verify(data.password, user.password_hash):
        return {"success": False, "error": "Incorrect email or password"}
    if not user.email_verified:
        return {"success": False, "error": "Please verify your email before logging in", "needs_email_verification": True}
    return {"success": True, "token": create_jwt(user.id), "user": user_public(user)}

# ── Current user ───────────────────────────────────────────────────────────

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"user": user_public(user)}
