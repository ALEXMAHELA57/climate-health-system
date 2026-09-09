from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string

from database import get_db, User, Lab, LabTest, LabBooking, FamilyProfile
from app.routers.auth import get_current_user

router = APIRouter()

CATEGORIES = {
    "blood":         {"en": "Blood Tests",        "sw": "Vipimo vya Damu"},
    "diabetes":      {"en": "Diabetes",            "sw": "Kisukari"},
    "hiv_sti":       {"en": "HIV / STI Testing",   "sw": "Upimaji wa VVU / Magonjwa ya Zinaa"},
    "pregnancy":     {"en": "Pregnancy",           "sw": "Ujauzito"},
    "cholesterol":   {"en": "Cholesterol",         "sw": "Lehemu"},
    "kidney_liver":  {"en": "Kidney / Liver",      "sw": "Figo / Ini"},
    "other":         {"en": "Other Diagnostics",   "sw": "Vipimo Vingine"},
}

def gen_id(prefix: str) -> str:
    return prefix + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

# ── Seed starter labs/tests so the directory isn't empty ─────────────────────
# NOTE: PLACEHOLDER entries. Replace with real, verified partner labs before
# this goes live to real patients.
SEED_LABS = [
    {"name": "AfyaHewa Partner Lab - Dar es Salaam", "address": "Dar es Salaam", "phone": "", "district": "Dar es Salaam"},
]
SEED_TESTS = [
    {"name": "Full Blood Count", "category": "blood", "price": 15000, "sensitive": False},
    {"name": "Fasting Blood Glucose", "category": "diabetes", "price": 8000, "sensitive": False},
    {"name": "HbA1c (3-month average)", "category": "diabetes", "price": 25000, "sensitive": False},
    {"name": "HIV Test", "category": "hiv_sti", "price": 10000, "sensitive": True},
    {"name": "STI Panel", "category": "hiv_sti", "price": 35000, "sensitive": True},
    {"name": "Pregnancy Test", "category": "pregnancy", "price": 5000, "sensitive": False},
    {"name": "Cholesterol Panel", "category": "cholesterol", "price": 20000, "sensitive": False},
    {"name": "Kidney Function Test", "category": "kidney_liver", "price": 22000, "sensitive": False},
    {"name": "Liver Function Test", "category": "kidney_liver", "price": 22000, "sensitive": False},
]

def ensure_seed(db: Session):
    if db.query(Lab).count() == 0:
        for l in SEED_LABS:
            db.add(Lab(**l))
        db.commit()
        lab = db.query(Lab).first()
        for t in SEED_TESTS:
            db.add(LabTest(lab_id=lab.id, **t))
        db.commit()

class BookingIn(BaseModel):
    lab_id: int
    test_id: int
    patient_name: str
    patient_phone: str
    scheduled_date: str
    family_profile_id: Optional[int] = None

class StatusIn(BaseModel):
    status: str

class ResultIn(BaseModel):
    result_summary: str

@router.get("/categories")
def list_categories():
    return {"categories": [{"id": k, **v} for k, v in CATEGORIES.items()]}

@router.get("/labs")
def list_labs(district: Optional[str] = None, db: Session = Depends(get_db)):
    ensure_seed(db)
    q = db.query(Lab).filter(Lab.active == True)
    if district:
        q = q.filter(Lab.district == district)
    labs = q.all()
    return {"labs": [{"id": l.id, "name": l.name, "address": l.address, "phone": l.phone, "district": l.district} for l in labs]}

@router.get("/labs/{lab_id}/tests")
def list_tests(lab_id: int, category: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(LabTest).filter(LabTest.lab_id == lab_id, LabTest.active == True)
    if category:
        q = q.filter(LabTest.category == category)
    tests = q.all()
    return {"tests": [{
        "id": t.id, "name": t.name, "category": t.category,
        "category_label": CATEGORIES.get(t.category, {}).get("en", t.category),
        "price": t.price, "sensitive": t.sensitive,
    } for t in tests]}

@router.post("/bookings")
def book_test(data: BookingIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    test = db.query(LabTest).filter(LabTest.id == data.test_id, LabTest.active == True).first()
    if not test:
        return {"success": False, "error": "Test not found"}

    bid = gen_id("LAB")
    booking = LabBooking(
        booking_id=bid, owner_user_id=user.id, family_profile_id=data.family_profile_id,
        lab_id=data.lab_id, test_id=data.test_id, patient_name=data.patient_name,
        patient_phone=data.patient_phone, scheduled_date=data.scheduled_date, status="booked",
    )
    db.add(booking)
    db.commit()
    return {"success": True, "booking_id": bid, "sensitive": test.sensitive}

@router.get("/bookings/mine")
def list_my_bookings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bookings = db.query(LabBooking).filter(LabBooking.owner_user_id == user.id).order_by(LabBooking.created_at.desc()).all()
    result = []
    for b in bookings:
        test = db.query(LabTest).filter(LabTest.id == b.test_id).first()
        lab = db.query(Lab).filter(Lab.id == b.lab_id).first()
        result.append({
            "booking_id": b.booking_id, "test_name": test.name if test else "Unknown",
            "sensitive": test.sensitive if test else False, "lab_name": lab.name if lab else "Unknown",
            "scheduled_date": b.scheduled_date, "status": b.status,
            "result_summary": b.result_summary, "result_ready": b.status == "results_ready",
        })
    return {"bookings": result}

@router.patch("/bookings/{booking_id}/status")
def update_status(booking_id: str, data: StatusIn, db: Session = Depends(get_db)):
    booking = db.query(LabBooking).filter(LabBooking.booking_id == booking_id).first()
    if not booking:
        return {"success": False, "error": "Booking not found"}
    booking.status = data.status
    db.commit()
    return {"success": True}

@router.post("/bookings/{booking_id}/result")
def upload_result(booking_id: str, data: ResultIn, db: Session = Depends(get_db)):
    # NOTE: intended for lab staff/admin use - not yet gated behind an admin
    # auth check, matching the same pre-existing gap noted in weather.py's
    # seasonal alerts. Add proper admin auth before this is used with real results.
    booking = db.query(LabBooking).filter(LabBooking.booking_id == booking_id).first()
    if not booking:
        return {"success": False, "error": "Booking not found"}
    booking.result_summary = data.result_summary
    booking.status = "results_ready"
    booking.result_ready_at = datetime.utcnow()
    db.commit()
    return {"success": True}
