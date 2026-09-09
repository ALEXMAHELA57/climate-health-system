from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db, User, EmergencyContact, EmergencyAlert
from app.routers.auth import get_current_user

router = APIRouter()

MIN_SECONDS_BETWEEN_ALERTS = 60  # simple abuse/accidental-double-tap guard

class ContactIn(BaseModel):
    name: str
    phone: str
    relationship_type: Optional[str] = "other"

class TriggerAlertIn(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("/contacts")
def add_contact(data: ContactIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = EmergencyContact(owner_user_id=user.id, name=data.name, phone=data.phone, relationship_type=data.relationship_type)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return {"success": True, "contact_id": contact.id}

@router.get("/contacts")
def list_contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(EmergencyContact).filter(EmergencyContact.owner_user_id == user.id).all()
    return {"contacts": [{"id": c.id, "name": c.name, "phone": c.phone, "relationship_type": c.relationship_type} for c in contacts]}

@router.delete("/contacts/{contact_id}")
def remove_contact(contact_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id, EmergencyContact.owner_user_id == user.id).first()
    if not contact:
        return {"success": False, "error": "Contact not found"}
    db.delete(contact)
    db.commit()
    return {"success": True}

@router.post("/trigger")
async def trigger_alert(data: TriggerAlertIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Guard against accidental double-fires (e.g. a stuck button) within the same minute
    recent = db.query(EmergencyAlert).filter(
        EmergencyAlert.owner_user_id == user.id,
        EmergencyAlert.created_at >= datetime.utcnow() - timedelta(seconds=MIN_SECONDS_BETWEEN_ALERTS),
    ).first()
    if recent:
        return {"success": True, "already_sent": True, "message": "Alert already sent moments ago"}

    contacts = db.query(EmergencyContact).filter(EmergencyContact.owner_user_id == user.id).all()
    if not contacts:
        return {"success": False, "error": "No emergency contacts added yet"}

    name = user.name or "A family member"
    if data.latitude and data.longitude:
        location_url = f"https://maps.google.com/?q={data.latitude},{data.longitude}"
        message = f"AfyaHewa Emergency Alert: {name} has triggered an emergency alert. Last known location: {location_url}. Please check on them or call them now."
    else:
        message = f"AfyaHewa Emergency Alert: {name} has triggered an emergency alert. Location unavailable. Please check on them or call them now."

    sent_count = 0
    try:
        from sms import send_beem_sms, normalize_phone
        for c in contacts:
            try:
                await send_beem_sms([{"recipient_id": "1", "dest_addr": normalize_phone(c.phone)}], message[:160])
                sent_count += 1
            except Exception as e:
                print(f"[emergency] Failed to notify {c.name}: {e}")
    except Exception as e:
        print(f"[emergency] SMS system unavailable: {e}")

    alert = EmergencyAlert(owner_user_id=user.id, latitude=data.latitude, longitude=data.longitude, contacts_notified=sent_count)
    db.add(alert)
    db.commit()

    return {"success": True, "contacts_notified": sent_count, "total_contacts": len(contacts)}
