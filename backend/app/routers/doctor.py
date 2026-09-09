from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import jwt
from passlib.context import CryptContext

from database import get_db, Doctor, Appointment, DoctorChangeRequest
from app.routers.auth import JWT_SECRET, JWT_ALGO

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_doctor_jwt(doctor_id: int) -> str:
    payload = {"doctor_id": doctor_id, "type": "doctor", "exp": datetime.utcnow() + timedelta(days=90), "iat": datetime.utcnow()}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_doctor(authorization: str = Header(None), db: Session = Depends(get_db)) -> Doctor:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("type") != "doctor":
        raise HTTPException(status_code=401, detail="Not a doctor session")
    doctor = db.query(Doctor).filter(Doctor.id == payload["doctor_id"], Doctor.active == True).first()
    if not doctor:
        raise HTTPException(status_code=401, detail="Doctor account not found")
    return doctor

class DoctorLoginIn(BaseModel):
    username: str
    password: str

class ChangeRequestIn(BaseModel):
    field: str  # prices | available_days | available_hours
    proposed_value: str

class AppointmentStatusIn(BaseModel):
    status: str

@router.post("/login")
def doctor_login(data: DoctorLoginIn, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.login_username == data.username, Doctor.active == True).first()
    if not doctor or not doctor.password_hash or not pwd_context.verify(data.password, doctor.password_hash):
        return {"success": False, "error": "Incorrect username or password"}
    return {"success": True, "token": create_doctor_jwt(doctor.id), "doctor": {
        "id": doctor.id, "name": doctor.name, "specialty": doctor.specialty, "photo_url": doctor.photo_url,
    }}

@router.get("/me")
def get_me(doctor: Doctor = Depends(get_current_doctor)):
    return {"doctor": {
        "id": doctor.id, "name": doctor.name, "specialty": doctor.specialty, "bio": doctor.bio,
        "photo_url": doctor.photo_url, "prices": json.loads(doctor.prices or "{}"),
        "consultation_types": doctor.consultation_types.split(","),
        "available_days": doctor.available_days.split(","), "available_hours": doctor.available_hours,
    }}

@router.get("/appointments")
def list_appointments(doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    appts = db.query(Appointment).filter(Appointment.doctor_id == doctor.id).order_by(Appointment.created_at.desc()).all()
    return {"appointments": [{
        "appointment_id": a.appointment_id, "patient_name": a.patient_name, "patient_phone": a.patient_phone,
        "specialty": a.specialty, "reason": a.reason, "requested_date": a.requested_date,
        "requested_time": a.requested_time, "consultation_type": a.consultation_type, "status": a.status,
    } for a in appts]}

@router.patch("/appointments/{appointment_id}/status")
def update_appointment_status(appointment_id: str, data: AppointmentStatusIn, doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id, Appointment.doctor_id == doctor.id).first()
    if not appt:
        return {"success": False, "error": "Appointment not found"}
    appt.status = data.status
    appt.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}

# ── Change requests (price/availability) - proposed, pending admin approval ──

@router.post("/change-requests")
def submit_change_request(data: ChangeRequestIn, doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    if data.field not in ("prices", "available_days", "available_hours"):
        return {"success": False, "error": "Invalid field"}
    req = DoctorChangeRequest(doctor_id=doctor.id, field=data.field, proposed_value=data.proposed_value, status="pending")
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"success": True, "request_id": req.id}

@router.get("/change-requests/mine")
def list_my_change_requests(doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)):
    reqs = db.query(DoctorChangeRequest).filter(DoctorChangeRequest.doctor_id == doctor.id).order_by(DoctorChangeRequest.created_at.desc()).all()
    return {"requests": [{"id": r.id, "field": r.field, "proposed_value": r.proposed_value, "status": r.status, "created_at": r.created_at.isoformat()} for r in reqs]}

# ── Admin side of the approval workflow ───────────────────────────────────
# NOTE: same pre-existing gap as the rest of the admin system - not yet
# gated behind admin auth. Add that before this is used for real.

@router.get("/admin/change-requests/pending")
def list_pending_change_requests(db: Session = Depends(get_db)):
    reqs = db.query(DoctorChangeRequest).filter(DoctorChangeRequest.status == "pending").all()
    result = []
    for r in reqs:
        doctor = db.query(Doctor).filter(Doctor.id == r.doctor_id).first()
        result.append({"id": r.id, "doctor_name": doctor.name if doctor else "Unknown", "field": r.field, "proposed_value": r.proposed_value, "created_at": r.created_at.isoformat()})
    return {"requests": result}

@router.post("/admin/change-requests/{request_id}/approve")
def approve_change_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(DoctorChangeRequest).filter(DoctorChangeRequest.id == request_id, DoctorChangeRequest.status == "pending").first()
    if not req:
        return {"success": False, "error": "Request not found"}
    doctor = db.query(Doctor).filter(Doctor.id == req.doctor_id).first()
    if doctor:
        setattr(doctor, req.field, req.proposed_value)
    req.status = "approved"
    req.responded_at = datetime.utcnow()
    db.commit()
    return {"success": True}

@router.post("/admin/change-requests/{request_id}/reject")
def reject_change_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(DoctorChangeRequest).filter(DoctorChangeRequest.id == request_id, DoctorChangeRequest.status == "pending").first()
    if not req:
        return {"success": False, "error": "Request not found"}
    req.status = "rejected"
    req.responded_at = datetime.utcnow()
    db.commit()
    return {"success": True}

class AdminDoctorLoginIn(BaseModel):
    username: str
    password: str

@router.post("/admin/set-login")
def admin_set_doctor_login(doctor_id: int, data: AdminDoctorLoginIn, db: Session = Depends(get_db)):
    """Admin creates/resets a doctor's login credentials - doctors never self-register."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        return {"success": False, "error": "Doctor not found"}
    existing = db.query(Doctor).filter(Doctor.login_username == data.username, Doctor.id != doctor_id).first()
    if existing:
        return {"success": False, "error": "That username is already taken"}
    doctor.login_username = data.username
    doctor.password_hash = pwd_context.hash(data.password)
    db.commit()
    return {"success": True}
