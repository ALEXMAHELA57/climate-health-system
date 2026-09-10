from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string
import json
from database import get_db, Doctor, Appointment, DoctorRating, FeeNegotiation, User, FamilyProfile
from app.routers.auth import get_current_user

router = APIRouter()

SPECIALTIES = {
    "general":              {"en": "General Doctors",            "sw": "Madaktari wa Jumla"},
    "mental_health":        {"en": "Mental Health",               "sw": "Afya ya Akili"},
    "male_reproductive":    {"en": "Male Reproductive Health",    "sw": "Afya ya Uzazi wa Mwanaume"},
    "female_reproductive":  {"en": "Female Reproductive Health",  "sw": "Afya ya Uzazi wa Mwanamke"},
    "maternal_health":      {"en": "Maternal Health",             "sw": "Afya ya Mama na Mtoto"},
    "menstrual_cycle":      {"en": "Menstrual Cycle",             "sw": "Mzunguko wa Hedhi"},
    "dental":               {"en": "Dental",                      "sw": "Meno"},
    "cardiology":           {"en": "Cardiology",                  "sw": "Moyo"},
    "dermatology":          {"en": "Skin (Dermatology)",          "sw": "Ngozi"},
    "nutrition":            {"en": "Nutrition",                   "sw": "Lishe"},
    "palliative_care":      {"en": "Palliative Care",             "sw": "Huduma ya Faraja"},
}

def gen_id(prefix: str) -> str:
    return prefix + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

# ── Seed a starter set of doctors so the directory isn't empty ───────────────
# NOTE: these are PLACEHOLDER entries. Replace with real, verified, licensed
# doctors before this goes live to real patients - see the proposal's Health
# Safety & Governance section regarding clinical review.
SEED_DOCTORS = [
    {"name": "Dr. Amina Juma",      "specialty": "general",             "bio": "General practitioner, 8 years experience.",              "phone": "", "consultation_types": "chat,voice", "prices": '{"chat": 5000, "voice": 8000}'},
    {"name": "Dr. Fatuma Ally",     "specialty": "mental_health",       "bio": "Clinical psychologist, counseling and mental health support.", "phone": "", "consultation_types": "chat,video", "prices": '{"chat": 6000, "video": 12000}'},
    {"name": "Dr. John Mrema",      "specialty": "male_reproductive",   "bio": "Urologist, men's reproductive and sexual health.",        "phone": "", "consultation_types": "chat,voice", "prices": '{"chat": 6000, "voice": 9000}'},
    {"name": "Dr. Grace Mushi",     "specialty": "female_reproductive", "bio": "Gynecologist, women's reproductive health.",              "phone": "", "consultation_types": "chat,video", "prices": '{"chat": 6000, "video": 12000}'},
    {"name": "Dr. Neema Kessy",     "specialty": "maternal_health",     "bio": "Obstetrician, pregnancy and maternal care.",              "phone": "", "consultation_types": "chat,video", "prices": '{"chat": 6000, "video": 12000}'},
    {"name": "Dr. Grace Mushi",     "specialty": "menstrual_cycle",     "bio": "Gynecologist, menstrual health and cycle-related concerns.", "phone": "", "consultation_types": "chat", "prices": '{"chat": 5000}'},
    {"name": "Dr. Hassan Kibwana",  "specialty": "dental",              "bio": "Dentist, general and restorative dental care.",           "phone": "", "consultation_types": "chat,voice", "prices": '{"chat": 5000, "voice": 8000}'},
    {"name": "Dr. Edward Lyimo",    "specialty": "cardiology",          "bio": "Cardiologist, heart health and hypertension management.", "phone": "", "consultation_types": "chat,voice", "prices": '{"chat": 7000, "voice": 10000}'},
    {"name": "Dr. Rehema Chuma",    "specialty": "dermatology",         "bio": "Dermatologist, skin, hair, and nail conditions.",         "phone": "", "consultation_types": "chat,video", "prices": '{"chat": 6000, "video": 11000}'},
    {"name": "Dr. Baraka Ndosi",    "specialty": "nutrition",           "bio": "Nutritionist, diet and nutrition counseling.",            "phone": "", "consultation_types": "chat", "prices": '{"chat": 4000}'},
    {"name": "Dr. Peter Massawe",   "specialty": "palliative_care",     "bio": "Palliative and supportive care specialist.",              "phone": "", "consultation_types": "chat,voice", "prices": '{"chat": 6000, "voice": 9000}'},
]

def ensure_seed_doctors(db: Session):
    existing_specialties = {row[0] for row in db.query(Doctor.specialty).distinct().all()}
    for d in SEED_DOCTORS:
        if d["specialty"] not in existing_specialties:
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
    family_profile_id: Optional[int] = None

class StatusIn(BaseModel):
    status: str  # confirmed | completed | cancelled

@router.get("/specialties")
def list_specialties():
    return {"specialties": [{"id": k, **v} for k, v in SPECIALTIES.items()]}

@router.get("/doctors")
def list_doctors(specialty: Optional[str] = None, affordable_only: bool = False, db: Session = Depends(get_db)):
    ensure_seed_doctors(db)
    q = db.query(Doctor).filter(Doctor.active == True)
    if specialty:
        q = q.filter(Doctor.specialty == specialty)
    if affordable_only:
        q = q.filter(Doctor.affordable_care == True)
    doctors = q.all()

    result = []
    for d in doctors:
        ratings = db.query(DoctorRating).filter(DoctorRating.doctor_id == d.id).all()
        avg_rating = round(sum(r.stars for r in ratings) / len(ratings), 1) if ratings else None
        result.append({
            "id": d.id, "name": d.name, "specialty": d.specialty,
            "specialty_label": SPECIALTIES.get(d.specialty, {}).get("en", d.specialty),
            "bio": d.bio, "consultation_types": d.consultation_types.split(","),
            "photo_url": d.photo_url, "prices": json.loads(d.prices or "{}"),
            "available_days": d.available_days.split(","), "available_hours": d.available_hours,
            "open_to_negotiation": d.open_to_negotiation, "affordable_care": d.affordable_care,
            "avg_rating": avg_rating, "rating_count": len(ratings),
        })
    return {"doctors": result}

@router.post("/appointments")
def book_appointment(data: AppointmentIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id, Doctor.active == True).first()
    if not doctor:
        return {"success": False, "error": "Doctor not found"}

    if data.family_profile_id:
        profile = db.query(FamilyProfile).filter(FamilyProfile.id == data.family_profile_id, FamilyProfile.managed_by_user_id == user.id, FamilyProfile.active == True).first()
        if not profile:
            return {"success": False, "error": "You don't manage this family profile"}

    appt_id = gen_id("APT")
    appt = Appointment(
        appointment_id=appt_id, owner_user_id=user.id, family_profile_id=data.family_profile_id, doctor_id=data.doctor_id,
        patient_name=data.patient_name, patient_phone=data.patient_phone,
        specialty=data.specialty, reason=data.reason,
        requested_date=data.requested_date, requested_time=data.requested_time,
        consultation_type=data.consultation_type, language=data.language,
        status="pending",
    )
    db.add(appt)
    db.commit()
    return {"success": True, "appointment_id": appt_id, "status": "pending"}

@router.get("/appointments/mine")
def get_my_appointments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything the logged-in account holder can see: their own
    appointments (by their own phone) plus every appointment booked for
    their managed family profiles - same pattern as medicine's /mine/all."""
    profile_ids = [p.id for p in db.query(FamilyProfile).filter(FamilyProfile.managed_by_user_id == user.id, FamilyProfile.active == True).all()]

    q = db.query(Appointment)
    own = q.filter(Appointment.owner_user_id == user.id, Appointment.family_profile_id.is_(None)).all()
    family = q.filter(Appointment.family_profile_id.in_(profile_ids)).all() if profile_ids else []
    # Also include any appointments booked before owner_user_id existed, matched by phone, so nothing already booked disappears
    legacy = q.filter(Appointment.owner_user_id.is_(None), Appointment.patient_phone == user.phone).all() if user.phone else []

    combined = {a.appointment_id: a for a in (own + family + legacy)}.values()
    result = []
    for a in sorted(combined, key=lambda x: x.created_at, reverse=True):
        doctor = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
        result.append({
            "appointment_id": a.appointment_id,
            "doctor_name": doctor.name if doctor else "Unknown",
            "specialty": a.specialty,
            "specialty_label": SPECIALTIES.get(a.specialty, {}).get("en", a.specialty),
            "requested_date": a.requested_date, "requested_time": a.requested_time,
            "consultation_type": a.consultation_type, "status": a.status,
            "reason": a.reason, "patient_name": a.patient_name,
        })
    return {"appointments": result}

@router.patch("/appointments/{appointment_id}/status")
def update_status(appointment_id: str, data: StatusIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not appt:
        return {"success": False, "error": "Appointment not found"}
    if appt.owner_user_id != user.id:
        return {"success": False, "error": "This isn't your appointment"}
    if data.status != "cancelled":
        return {"success": False, "error": "You can only cancel your own appointment - other status changes are made by the doctor"}
    appt.status = data.status
    appt.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}

# ── Ratings (patient rates a completed appointment) ───────────────────────

class RatingIn(BaseModel):
    stars: int
    comment: Optional[str] = ""

@router.post("/appointments/{appointment_id}/rate")
def rate_appointment(appointment_id: str, data: RatingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.stars < 1 or data.stars > 5:
        return {"success": False, "error": "Rating must be between 1 and 5 stars"}
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not appt:
        return {"success": False, "error": "Appointment not found"}
    if appt.patient_phone != user.phone:
        return {"success": False, "error": "This isn't your appointment"}
    if appt.status != "completed":
        return {"success": False, "error": "Only completed appointments can be rated"}
    existing = db.query(DoctorRating).filter(DoctorRating.appointment_id == appointment_id).first()
    if existing:
        return {"success": False, "error": "You've already rated this appointment"}

    rating = DoctorRating(doctor_id=appt.doctor_id, appointment_id=appointment_id, patient_phone=user.phone, stars=data.stars, comment=data.comment)
    db.add(rating)
    db.commit()
    return {"success": True}

# ── Fee negotiation (structured: one proposal, one counter, then accept/decline) ─

class NegotiationIn(BaseModel):
    doctor_id: int
    consultation_type: str
    proposed_price: float
    patient_name: str
    patient_phone: str

class NegotiationRespondIn(BaseModel):
    action: str  # accept | decline | counter
    counter_price: Optional[float] = None

@router.post("/negotiate")
def propose_negotiation(data: NegotiationIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id, Doctor.active == True).first()
    if not doctor:
        return {"success": False, "error": "Doctor not found"}
    if not doctor.open_to_negotiation:
        return {"success": False, "error": "This doctor has a fixed consultation fee"}
    prices = json.loads(doctor.prices or "{}")
    original_price = prices.get(data.consultation_type)
    if original_price is None:
        return {"success": False, "error": "This doctor doesn't offer that consultation type"}
    if data.proposed_price >= original_price:
        return {"success": False, "error": "Proposed price should be lower than the listed price"}

    nid = gen_id("NEG")
    neg = FeeNegotiation(
        negotiation_id=nid, doctor_id=data.doctor_id, patient_name=data.patient_name, patient_phone=data.patient_phone,
        consultation_type=data.consultation_type, original_price=original_price, proposed_price=data.proposed_price, status="pending",
    )
    db.add(neg)
    db.commit()
    return {"success": True, "negotiation_id": nid}

@router.get("/negotiate/mine")
def my_negotiations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    negs = db.query(FeeNegotiation).filter(FeeNegotiation.patient_phone == user.phone).order_by(FeeNegotiation.created_at.desc()).all() if user.phone else []
    result = []
    for n in negs:
        doctor = db.query(Doctor).filter(Doctor.id == n.doctor_id).first()
        result.append({
            "negotiation_id": n.negotiation_id, "doctor_name": doctor.name if doctor else "Unknown",
            "consultation_type": n.consultation_type, "original_price": n.original_price,
            "proposed_price": n.proposed_price, "counter_price": n.counter_price, "status": n.status,
        })
    return {"negotiations": result}

@router.post("/negotiate/{negotiation_id}/respond")
def respond_to_offer(negotiation_id: str, data: NegotiationRespondIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Patient's response to a doctor's counter-offer - can only accept or
    decline the counter, not propose a further counter (structured, not open-ended)."""
    neg = db.query(FeeNegotiation).filter(FeeNegotiation.negotiation_id == negotiation_id, FeeNegotiation.status == "countered").first()
    if not neg:
        return {"success": False, "error": "Negotiation not found or not awaiting your response"}
    if neg.patient_phone != user.phone:
        return {"success": False, "error": "This isn't your negotiation"}
    if data.action not in ("accept", "decline"):
        return {"success": False, "error": "Invalid action"}
    neg.status = "accepted" if data.action == "accept" else "declined"
    neg.responded_at = datetime.utcnow()
    db.commit()
    return {"success": True}
