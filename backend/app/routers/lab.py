from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import string
import jwt
from passlib.context import CryptContext

from database import get_db, User, Lab, LabTest, LabBooking, FamilyProfile, Admin
from app.routers.auth import get_current_user, JWT_SECRET, JWT_ALGO
from app.routers.admin_auth import get_current_admin

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_lab_jwt(lab_id: int) -> str:
    payload = {"lab_id": lab_id, "type": "lab", "exp": datetime.utcnow() + timedelta(days=90), "iat": datetime.utcnow()}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_lab(authorization: str = Header(None), db: Session = Depends(get_db)) -> Lab:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Lab login required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("type") != "lab":
        raise HTTPException(status_code=401, detail="Not a lab session")
    lab = db.query(Lab).filter(Lab.id == payload["lab_id"], Lab.active == True).first()
    if not lab:
        raise HTTPException(status_code=401, detail="Lab account not found")
    return lab

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
    {"name": "Malaria Test (RDT)", "category": "other", "price": 6000, "sensitive": False},
    {"name": "Thyroid Function Test", "category": "other", "price": 28000, "sensitive": False},
    {"name": "Urinalysis", "category": "other", "price": 7000, "sensitive": False},
    {"name": "Typhoid Test (Widal)", "category": "other", "price": 9000, "sensitive": False},
    {"name": "Vitamin D Test", "category": "other", "price": 30000, "sensitive": False},
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
    else:
        # Backfill any seed tests added after the initial seed ran (e.g. new
        # categories) - same gap we hit with doctor seeding earlier.
        lab = db.query(Lab).first()
        if lab:
            existing_names = {t.name for t in db.query(LabTest).filter(LabTest.lab_id == lab.id).all()}
            for t in SEED_TESTS:
                if t["name"] not in existing_names:
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

class AdminLabIn(BaseModel):
    name: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    district: str

@router.post("/admin/labs")
def admin_create_lab(data: AdminLabIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    if not data.name.strip():
        return {"success": False, "error": "Enter a lab name"}
    if not data.district.strip():
        return {"success": False, "error": "Enter a district"}
    lab = Lab(name=data.name, address=data.address or "", phone=data.phone or "", district=data.district, active=True)
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return {"success": True, "lab_id": lab.id}

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
def update_status(booking_id: str, data: StatusIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    booking = db.query(LabBooking).filter(LabBooking.booking_id == booking_id).first()
    if not booking:
        return {"success": False, "error": "Booking not found"}
    booking.status = data.status
    db.commit()
    return {"success": True}

@router.post("/bookings/{booking_id}/result")
async def upload_result(booking_id: str, data: ResultIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Intended for lab staff/admin use.
    booking = db.query(LabBooking).filter(LabBooking.booking_id == booking_id).first()
    if not booking:
        return {"success": False, "error": "Booking not found"}
    booking.result_summary = data.result_summary
    booking.status = "results_ready"
    booking.result_ready_at = datetime.utcnow()
    db.commit()

    if booking.patient_phone:
        try:
            from sms import send_beem_sms, normalize_phone
            test = db.query(LabTest).filter(LabTest.id == booking.test_id).first()
            # Keep the message generic for sensitive tests (HIV/STI) - a named
            # test in an SMS someone else glimpses could out a diagnosis.
            test_name = "your test" if (test and test.sensitive) else (test.name if test else "your test")
            msg = f"AfyaHewa: Your {test_name} result is ready. Open the app under Lab & Diagnostics > My Bookings to view it."
            await send_beem_sms([{"recipient_id": "1", "dest_addr": normalize_phone(booking.patient_phone)}], msg[:160])
        except Exception as e:
            print(f"[lab] Could not notify patient of ready result: {e}")

    return {"success": True}

# ── Lab self-service - login, own bookings, own tests/pricing ─────────────
# Labs don't self-register - admin creates their login, then they manage
# their own bookings and test pricing. Same pattern as Doctor/Vendor Portal.

class LabLoginIn(BaseModel):
    username: str
    password: str

class AdminLabLoginIn(BaseModel):
    username: str
    password: str

class LabTestIn(BaseModel):
    name: str
    category: str
    price: float
    sensitive: bool = False

class LabTestUpdateIn(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    active: Optional[bool] = None

@router.post("/admin/labs/{lab_id}/set-login")
def admin_set_lab_login(lab_id: int, data: AdminLabLoginIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    lab = db.query(Lab).filter(Lab.id == lab_id).first()
    if not lab:
        return {"success": False, "error": "Lab not found"}
    existing = db.query(Lab).filter(Lab.login_username == data.username, Lab.id != lab_id).first()
    if existing:
        return {"success": False, "error": "That username is already taken"}
    lab.login_username = data.username
    lab.password_hash = pwd_context.hash(data.password)
    db.commit()
    return {"success": True}

@router.post("/lab-portal/login")
def lab_login(data: LabLoginIn, db: Session = Depends(get_db)):
    lab = db.query(Lab).filter(Lab.login_username == data.username, Lab.active == True).first()
    if not lab or not lab.password_hash or not pwd_context.verify(data.password, lab.password_hash):
        return {"success": False, "error": "Incorrect username or password"}
    return {"success": True, "token": create_lab_jwt(lab.id), "lab": {"id": lab.id, "name": lab.name}}

@router.get("/lab-portal/me")
def lab_me(lab: Lab = Depends(get_current_lab)):
    return {"lab": {"id": lab.id, "name": lab.name, "address": lab.address, "phone": lab.phone, "district": lab.district}}

@router.get("/lab-portal/bookings")
def lab_bookings(lab: Lab = Depends(get_current_lab), db: Session = Depends(get_db)):
    bookings = db.query(LabBooking).filter(LabBooking.lab_id == lab.id).order_by(LabBooking.id.desc()).all()
    result = []
    for b in bookings:
        test = db.query(LabTest).filter(LabTest.id == b.test_id).first()
        result.append({
            "booking_id": b.booking_id, "test_name": test.name if test else "Unknown",
            "patient_name": b.patient_name, "patient_phone": b.patient_phone,
            "scheduled_date": b.scheduled_date, "status": b.status, "result_summary": b.result_summary,
        })
    return {"bookings": result}

@router.patch("/lab-portal/bookings/{booking_id}/status")
def lab_update_status(booking_id: str, data: StatusIn, lab: Lab = Depends(get_current_lab), db: Session = Depends(get_db)):
    booking = db.query(LabBooking).filter(LabBooking.booking_id == booking_id, LabBooking.lab_id == lab.id).first()
    if not booking:
        return {"success": False, "error": "Booking not found"}
    booking.status = data.status
    db.commit()
    return {"success": True}

@router.post("/lab-portal/bookings/{booking_id}/result")
async def lab_upload_result(booking_id: str, data: ResultIn, lab: Lab = Depends(get_current_lab), db: Session = Depends(get_db)):
    booking = db.query(LabBooking).filter(LabBooking.booking_id == booking_id, LabBooking.lab_id == lab.id).first()
    if not booking:
        return {"success": False, "error": "Booking not found"}
    booking.result_summary = data.result_summary
    booking.status = "results_ready"
    booking.result_ready_at = datetime.utcnow()
    db.commit()

    if booking.patient_phone:
        try:
            from sms import send_beem_sms, normalize_phone
            test = db.query(LabTest).filter(LabTest.id == booking.test_id).first()
            # Keep the message generic for sensitive tests (HIV/STI) - a named
            # test in an SMS someone else glimpses could out a diagnosis.
            test_name = "your test" if (test and test.sensitive) else (test.name if test else "your test")
            msg = f"AfyaHewa: Your {test_name} result is ready. Open the app under Lab & Diagnostics > My Bookings to view it."
            await send_beem_sms([{"recipient_id": "1", "dest_addr": normalize_phone(booking.patient_phone)}], msg[:160])
        except Exception as e:
            print(f"[lab] Could not notify patient of ready result: {e}")

    return {"success": True}

@router.get("/lab-portal/tests")
def lab_tests(lab: Lab = Depends(get_current_lab), db: Session = Depends(get_db)):
    tests = db.query(LabTest).filter(LabTest.lab_id == lab.id).all()
    return {"tests": [{"id": t.id, "name": t.name, "category": t.category, "price": t.price, "active": t.active, "sensitive": t.sensitive} for t in tests]}

@router.post("/lab-portal/tests")
def lab_add_test(data: LabTestIn, lab: Lab = Depends(get_current_lab), db: Session = Depends(get_db)):
    if data.category not in CATEGORIES:
        return {"success": False, "error": "Invalid category"}
    test = LabTest(lab_id=lab.id, active=True, **data.dict())
    db.add(test)
    db.commit()
    db.refresh(test)
    return {"success": True, "test_id": test.id}

@router.patch("/lab-portal/tests/{test_id}")
def lab_update_test(test_id: int, data: LabTestUpdateIn, lab: Lab = Depends(get_current_lab), db: Session = Depends(get_db)):
    test = db.query(LabTest).filter(LabTest.id == test_id, LabTest.lab_id == lab.id).first()
    if not test:
        return {"success": False, "error": "Test not found"}
    for field, value in data.dict(exclude_unset=True).items():
        setattr(test, field, value)
    db.commit()
    return {"success": True}
