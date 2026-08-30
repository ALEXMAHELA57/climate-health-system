from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime
import random
import string
from database import get_db, MedicineReminder

router = APIRouter()

def gen_id(prefix: str) -> str:
    return prefix + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

class ReminderIn(BaseModel):
    patient_phone: str
    medicine_name: str
    dosage: Optional[str] = ""
    times: List[str]           # ["08:00", "14:00", "20:00"]
    start_date: str            # "YYYY-MM-DD"
    end_date: Optional[str] = None
    sms_fallback: Optional[bool] = True
    language: Optional[str] = "en"

@router.post("")
def create_reminder(data: ReminderIn, db: Session = Depends(get_db)):
    rid = gen_id("MED")
    reminder = MedicineReminder(
        reminder_id=rid,
        patient_phone=data.patient_phone,
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
def list_reminders(phone: str, db: Session = Depends(get_db)):
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
    } for r in reminders]}

@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: str, db: Session = Depends(get_db)):
    reminder = db.query(MedicineReminder).filter(MedicineReminder.reminder_id == reminder_id).first()
    if not reminder:
        return {"success": False, "error": "Reminder not found"}
    reminder.active = False
    db.commit()
    return {"success": True}
