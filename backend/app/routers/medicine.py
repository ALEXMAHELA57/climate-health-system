from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string
from database import get_db, MedicineReminder, FamilyProfile, User
from app.routers.auth import get_current_user

router = APIRouter()

def gen_id(prefix: str) -> str:
    return prefix + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

def verify_family_access(family_profile_id, user, db) -> bool:
    if not family_profile_id:
        return True
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == family_profile_id, FamilyProfile.managed_by_user_id == user.id, FamilyProfile.active == True).first()
    return profile is not None

class ReminderIn(BaseModel):
    patient_phone: str
    medicine_name: str
    dosage: Optional[str] = ""
    times: List[str]           # ["08:00", "14:00", "20:00"]
    start_date: str            # "YYYY-MM-DD"
    end_date: Optional[str] = None
    sms_fallback: Optional[bool] = True
    language: Optional[str] = "en"
    family_profile_id: Optional[int] = None  # set when creating this on behalf of a managed family member

@router.post("")
def create_reminder(data: ReminderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(data.family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}

    rid = gen_id("MED")
    on_behalf_of_name = None
    patient_phone = data.patient_phone

    if data.family_profile_id:
        profile = db.query(FamilyProfile).filter(FamilyProfile.id == data.family_profile_id, FamilyProfile.active == True).first()
        if profile:
            on_behalf_of_name = profile.name
            # The family member's own phone gets the SMS if they have one on file;
            # otherwise fall back to whatever phone was submitted (typically the
            # managing account holder's own number).
            if profile.phone:
                patient_phone = profile.phone

    reminder = MedicineReminder(
        reminder_id=rid,
        patient_phone=patient_phone,
        family_profile_id=data.family_profile_id,
        on_behalf_of_name=on_behalf_of_name,
        medicine_name=data.medicine_name,
        dosage=data.dosage,
        times=",".join(data.times),
        start_date=data.start_date,
        end_date=data.end_date,
        sms_fallback=data.sms_fallback,
        language=data.language,
        active=True,
    )
    db.add(reminder)
    db.commit()
    return {"success": True, "reminder_id": rid}

@router.get("/{phone}")
def list_reminders(phone: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # NOTE: kept for backward compatibility with the mobile app, which
    # doesn't have its own account system yet - but now requires being
    # logged in, and only returns results if the requested phone actually
    # matches the logged-in account's own phone. This closes the privacy
    # gap (anyone could previously look up anyone else's medicine list by
    # phone number alone) while mobile catches up to real per-user auth.
    if not user.phone or phone != user.phone:
        return {"reminders": []}
    reminders = db.query(MedicineReminder).filter(
        MedicineReminder.patient_phone == phone,
        MedicineReminder.active == True,
    ).order_by(MedicineReminder.created_at.desc()).all()
    return {"reminders": [{
        "reminder_id": r.reminder_id,
        "medicine_name": r.medicine_name,
        "dosage": r.dosage,
        "times": r.times.split(","),
        "start_date": r.start_date,
        "end_date": r.end_date,
        "sms_fallback": r.sms_fallback,
        "language": r.language,
        "on_behalf_of_name": r.on_behalf_of_name,
    } for r in reminders]}

@router.get("/mine/all")
def list_my_reminders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything the logged-in account holder manages: their own reminders
    (by their own phone) plus every reminder created for their managed
    family profiles - one combined view, regardless of whose phone
    actually receives each SMS."""
    profile_ids = [p.id for p in db.query(FamilyProfile).filter(FamilyProfile.managed_by_user_id == user.id, FamilyProfile.active == True).all()]

    query = db.query(MedicineReminder).filter(MedicineReminder.active == True)
    own = query.filter(MedicineReminder.patient_phone == user.phone).all() if user.phone else []
    family = query.filter(MedicineReminder.family_profile_id.in_(profile_ids)).all() if profile_ids else []

    combined = {r.reminder_id: r for r in (own + family)}.values()  # dedupe just in case
    return {"reminders": [{
        "reminder_id": r.reminder_id,
        "medicine_name": r.medicine_name,
        "dosage": r.dosage,
        "times": r.times.split(","),
        "start_date": r.start_date,
        "end_date": r.end_date,
        "on_behalf_of_name": r.on_behalf_of_name,
        "is_own": r.family_profile_id is None,
    } for r in combined]}

@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reminder = db.query(MedicineReminder).filter(MedicineReminder.reminder_id == reminder_id).first()
    if not reminder:
        return {"success": False, "error": "Reminder not found"}
    owns_directly = user.phone and reminder.patient_phone == user.phone and not reminder.family_profile_id
    owns_via_family = reminder.family_profile_id and verify_family_access(reminder.family_profile_id, user, db)
    if not (owns_directly or owns_via_family):
        return {"success": False, "error": "This isn't your reminder"}
    reminder.active = False
    db.commit()
    return {"success": True}
