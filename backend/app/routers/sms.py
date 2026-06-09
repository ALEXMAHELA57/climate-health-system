from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db, Subscriber, SMSLog

router = APIRouter()

class SubscribeIn(BaseModel):
    phone: str
    region: Optional[str] = ""
    language: Optional[str] = "en"

class BroadcastIn(BaseModel):
    message: str
    region: Optional[str] = "ALL"
    language: Optional[str] = "both"

@router.post("/subscribe")
async def subscribe(data: SubscribeIn, db: Session = Depends(get_db)):
    existing = db.query(Subscriber).filter(Subscriber.phone == data.phone).first()
    if existing:
        existing.region = data.region
        existing.language = data.language
        existing.active = True
        db.commit()
        return {"success": True, "message": "Updated subscription"}
    sub = Subscriber(
        phone    = data.phone,
        region   = data.region,
        language = data.language,
        active   = True
    )
    db.add(sub)
    db.commit()
    return {"success": True, "message": "Subscribed successfully"}

@router.post("/unsubscribe")
async def unsubscribe(data: SubscribeIn, db: Session = Depends(get_db)):
    sub = db.query(Subscriber).filter(Subscriber.phone == data.phone).first()
    if sub:
        sub.active = False
        db.commit()
    return {"success": True}

@router.post("/broadcast")
async def broadcast(data: BroadcastIn, db: Session = Depends(get_db)):
    query = db.query(Subscriber).filter(Subscriber.active == True)
    if data.region and data.region != "ALL":
        query = query.filter(Subscriber.region == data.region)
    if data.language != "both":
        query = query.filter(Subscriber.language == data.language)
    subscribers = query.all()
    # Log the broadcast (actual SMS sending activated when Africa's Talking key is added)
    for sub in subscribers:
        log = SMSLog(
            phone   = sub.phone,
            message = data.message,
            region  = sub.region,
            status  = "pending"
        )
        db.add(log)
    db.commit()
    return {"success": True, "sent": len(subscribers)}

@router.get("/subscribers")
async def get_subscribers(db: Session = Depends(get_db)):
    subs = db.query(Subscriber).filter(Subscriber.active == True).order_by(Subscriber.subscribed_at.desc()).all()
    return {
        "subscribers": [
            {
                "phone": s.phone,
                "region": s.region,
                "language": s.language,
                "subscribed_at": s.subscribed_at.isoformat()
            } for s in subs
        ],
        "total": len(subs)
    }
