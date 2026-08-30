from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string
from database import get_db, Doctor, Appointment

router = APIRouter()

SPECIALTIES = {
    "general":             {"en": "General Consultation",        "sw": "Ushauri wa Jumla"},
    "reproductive_health":  {"en": "Reproductive Health",         "sw": "Afya ya Uzazi"},
    "palliative_care":      {"en": "Palliative Care",             "sw": "Huduma ya Faraja"},
    "mental_health":        {"en": "Mental Health & Psychology",  "sw": "Afya ya Akili na Saikolojia"},
}

def gen_id(prefix: str) -> str:
    return prefix + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

# ── Seed a starter set of doctors so the directory isn't empty ───────────────
# NOTE: these are PLACEHOLDER entries. Replace with real, verified, licensed
# doctors before this goes live to real patients - see the proposal's Health
# Safety & Governance section regarding clinical review.
SEED_DOCTORS = [
    {"name": "Dr. Amina Juma", "specialty": "general", "bio": "General practitioner, 8 years experience.", "phone": "", "consultation_types": "chat,voice"},
    {"name": "Dr. Grace Mushi", "specialty": "reproductive_health", "bio": "Gynecologist, reproductive and maternal health.", "phone": "", "consultation_types": "chat,video"},
    {"name": "Dr. Peter Massawe", "specialty": "palliative_care", "bio": "Palliative and supportive care specialist.", "phone": "", "consultation_types": "chat,voice"},
    {"name": "Dr. Fatuma Ally", "specialty": "mental_health", "bio": "Clinical psychologist, counseling and mental health support.", "phone": "", "consultation_types": "chat,video"},
]

def ensure_seed_doctors(db: Session):
    if db.query(Doctor).count() == 0:
        for d in SEED_DOCTORS:
            db.add(Doctor(**d))
        db.commit()

class AppointmentIn(BaseModel):
    doctor_id: int
    patient_name: str
    patient_phone: str
    specialty: str
    reason: Optional[str] = ""
    requested_date: str   # "YYYY-MM-DD"
    requested_time: str   # "HH:MM"
    consultation_type: Optional[str] = "chat"
    language: Optional[str] = "en"

class StatusIn(BaseModel):
    status: str  # confirmed | completed | cancelled

@router.get("/specialties")
def list_specialties():
    return {"specialties": [{"id": k, **v} for k, v in SPECIALTIES.items()]}

@router.get("/doctors")
def list_doctors(specialty: Optional[str] = None, db: Session = Depends(get_db)):
    ensure_seed_doctors(db)
    q = db.query(Doctor).filter(Doctor.active == True)
    if specialty:
        q = q.filter(Doctor.specialty == specialty)
    doctors = q.all()
    return {"doctors": [{
        "id": d.id, "name": d.name, "specialty": d.specialty,
        "specialty_label": SPECIALTIES.get(d.specialty, {}).get("en", d.specialty),
        "bio": d.bio, "consultation_types": d.consultation_types.split(","),
        "available_days": d.available_days.split(","), "available_hours": d.available_hours,
    } for d in doctors]}

@router.post("/appointments")
def book_appointment(data: AppointmentIn, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id, Doctor.active == True).first()
    if not doctor:
        return {"success": False, "error": "Doctor not found"}

    appt_id = gen_id("APT")
    appt = Appointment(
        appointment_id=appt_id, doctor_id=data.doctor_id,
        patient_name=data.patient_name, patient_phone=data.patient_phone,
        specialty=data.specialty, reason=data.reason,
        requested_date=data.requested_date, requested_time=data.requested_time,
        consultation_type=data.consultation_type, language=data.language,
        status="pending",
    )
    db.add(appt)
    db.commit()
    return {"success": True, "appointment_id": appt_id, "status": "pending"}

@router.get("/appointments/{phone}")
def get_appointments(phone: str, db: Session = Depends(get_db)):
    appts = db.query(Appointment).filter(Appointment.patient_phone == phone).order_by(Appointment.created_at.desc()).all()
    result = []
    for a in appts:
        doctor = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
        result.append({
            "appointment_id": a.appointment_id,
            "doctor_name": doctor.name if doctor else "Unknown",
            "specialty": a.specialty,
            "specialty_label": SPECIALTIES.get(a.specialty, {}).get("en", a.specialty),
            "requested_date": a.requested_date, "requested_time": a.requested_time,
            "consultation_type": a.consultation_type, "status": a.status,
            "reason": a.reason,
        })
    return {"appointments": result}

@router.patch("/appointments/{appointment_id}/status")
def update_status(appointment_id: str, data: StatusIn, db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not appt:
        return {"success": False, "error": "Appointment not found"}
    appt.status = data.status
    appt.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}
