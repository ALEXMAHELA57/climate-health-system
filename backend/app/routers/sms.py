from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db, Subscriber, SMSLog
import httpx
import os
import base64
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

BEEM_API_URL = "https://apisms.beem.africa/v1/send"
BEEM_API_KEY = os.getenv("BEEM_API_KEY", "")
BEEM_SECRET_KEY = os.getenv("BEEM_SECRET_KEY", "")
BEEM_SENDER_NAME = os.getenv("BEEM_SENDER_NAME", "AfyaHewa")

# ── Helpers ───────────────────────────────────────────────────────────────────

def beem_auth_header():
    """Basic auth header for Beem API."""
    token = base64.b64encode(f"{BEEM_API_KEY}:{BEEM_SECRET_KEY}".encode()).decode()
    return f"Basic {token}"

async def send_beem_sms(recipients: list, message: str) -> dict:
    """Send SMS via Beem Africa API.
    recipients: list of dicts with recipient_id and dest_addr (255XXXXXXXXX format)
    Returns: {"success": bool, "sent": int, "failed": int, "error": str|None}
    """
    if not BEEM_API_KEY or not BEEM_SECRET_KEY:
        return {"success": False, "sent": 0, "failed": len(recipients), "error": "Beem API keys not configured"}

    if not recipients:
        return {"success": True, "sent": 0, "failed": 0, "error": None}

    # Beem API accepts max 1000 recipients per request — batch if needed
    batch_size = 1000
    total_sent = 0
    total_failed = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(0, len(recipients), batch_size):
            batch = recipients[i:i + batch_size]
            payload = {
                "source_addr": BEEM_SENDER_NAME,
                "encoding": 0,
                "schedule_time": "",
                "message": message,
                "recipients": batch
            }
            try:
                response = await client.post(
                    BEEM_API_URL,
                    json=payload,
                    headers={
                        "Authorization": beem_auth_header(),
                        "Content-Type": "application/json"
                    }
                )
                data = response.json()
                # Beem returns code 100 for success
                if response.status_code == 200 and data.get("code") == 100:
                    total_sent += len(batch)
                else:
                    total_failed += len(batch)
            except Exception as e:
                total_failed += len(batch)

    return {
        "success": total_failed == 0,
        "sent": total_sent,
        "failed": total_failed,
        "error": None if total_failed == 0 else f"{total_failed} messages failed"
    }

def normalize_phone(phone: str) -> str:
    """Normalize Tanzania phone number to 255XXXXXXXXX format."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0"):
        phone = "255" + phone[1:]
    return phone

def build_message(template: str, region: str, lang: str) -> str:
    """Build an SMS message under 160 chars."""
    msg = template.format(region=region) if "{region}" in template else template
    # Ensure under 160 chars (one SMS unit)
    if len(msg) > 160:
        msg = msg[:157] + "..."
    return msg

# ── Subscription endpoints ────────────────────────────────────────────────────

class SubscribeIn(BaseModel):
    phone: str
    region: Optional[str] = ""
    language: Optional[str] = "en"

@router.post("/subscribe")
async def subscribe(data: SubscribeIn, db: Session = Depends(get_db)):
    phone = normalize_phone(data.phone)
    existing = db.query(Subscriber).filter(Subscriber.phone == phone).first()
    if existing:
        existing.region = data.region
        existing.language = data.language
        existing.active = True
        db.commit()
        msg_en = f"AfyaHewa: You are subscribed for health alerts in {data.region}. Reply STOP to unsubscribe."
        msg_sw = f"AfyaHewa: Umejisajili kupokea tahadhari za afya za {data.region}. Jibu STOP kujiondoa."
        message = msg_sw if data.language == "sw" else msg_en
    else:
        sub = Subscriber(phone=phone, region=data.region, language=data.language, active=True)
        db.add(sub)
        db.commit()
        msg_en = f"AfyaHewa: You are subscribed for health alerts in {data.region}. Reply STOP to unsubscribe."
        msg_sw = f"AfyaHewa: Umejisajili kupokea tahadhari za afya za {data.region}. Jibu STOP kujiondoa."
        message = msg_sw if data.language == "sw" else msg_en

    # Send confirmation SMS
    result = await send_beem_sms(
        [{"recipient_id": "1", "dest_addr": phone}],
        message
    )
    return {"success": True, "sms_sent": result["sent"] > 0}

@router.post("/unsubscribe")
async def unsubscribe(data: SubscribeIn, db: Session = Depends(get_db)):
    phone = normalize_phone(data.phone)
    sub = db.query(Subscriber).filter(Subscriber.phone == phone).first()
    if sub:
        sub.active = False
        db.commit()
    return {"success": True}

@router.get("/subscribers")
async def get_subscribers(db: Session = Depends(get_db)):
    subs = db.query(Subscriber).filter(Subscriber.active == True)\
        .order_by(Subscriber.subscribed_at.desc()).all()
    return {
        "subscribers": [
            {"phone": s.phone, "region": s.region, "language": s.language,
             "subscribed_at": s.subscribed_at.isoformat()}
            for s in subs
        ],
        "total": len(subs)
    }

# ── Alert sending endpoints ───────────────────────────────────────────────────

class AlertIn(BaseModel):
    region: str
    alert_type: str   # weather | outbreak | emergency
    risk_level: str   # low | medium | high | emergency
    message_en: str
    message_sw: str

@router.post("/send-alert")
async def send_alert(data: AlertIn, db: Session = Depends(get_db)):
    """Send a health/weather alert to all subscribers in a region."""
    # Get active subscribers for this region
    subscribers = db.query(Subscriber).filter(
        Subscriber.active == True,
        Subscriber.region == data.region
    ).all()

    if not subscribers:
        return {"success": True, "sent": 0, "message": "No subscribers in this region"}

    # Build recipient lists per language
    en_recipients = []
    sw_recipients = []
    for i, sub in enumerate(subscribers):
        r = {"recipient_id": str(i + 1), "dest_addr": sub.phone}
        if sub.language == "sw":
            sw_recipients.append(r)
        else:
            en_recipients.append(r)

    total_sent = 0
    total_failed = 0

    if en_recipients:
        result = await send_beem_sms(en_recipients, data.message_en[:160])
        total_sent += result["sent"]
        total_failed += result["failed"]

    if sw_recipients:
        result = await send_beem_sms(sw_recipients, data.message_sw[:160])
        total_sent += result["sent"]
        total_failed += result["failed"]

    # Log the send
    log = SMSLog(
        phone=f"[{data.region} bulk: {len(subscribers)} subs]",
        message=data.message_en,
        region=data.region,
        status="sent" if total_failed == 0 else "partial"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "sent": total_sent,
        "failed": total_failed,
        "subscribers": len(subscribers)
    }

class BroadcastIn(BaseModel):
    message: str
    region: Optional[str] = "ALL"
    language: Optional[str] = "both"

@router.post("/broadcast")
async def broadcast(data: BroadcastIn, db: Session = Depends(get_db)):
    """Admin broadcast — send a custom message to subscribers."""
    query = db.query(Subscriber).filter(Subscriber.active == True)
    if data.region and data.region != "ALL":
        query = query.filter(Subscriber.region == data.region)
    if data.language != "both":
        query = query.filter(Subscriber.language == data.language)
    subscribers = query.all()

    if not subscribers:
        return {"success": True, "sent": 0}

    recipients = [
        {"recipient_id": str(i + 1), "dest_addr": sub.phone}
        for i, sub in enumerate(subscribers)
    ]

    result = await send_beem_sms(recipients, data.message[:160])

    log = SMSLog(
        phone=f"[broadcast {data.region}: {len(subscribers)} subs]",
        message=data.message,
        region=data.region or "ALL",
        status="sent" if result["success"] else "failed"
    )
    db.add(log)
    db.commit()

    return {"success": result["success"], "sent": result["sent"], "failed": result["failed"]}

@router.get("/logs")
async def get_sms_logs(db: Session = Depends(get_db)):
    """Recent SMS send history for admin visibility."""
    logs = db.query(SMSLog).order_by(SMSLog.sent_at.desc()).limit(50).all()
    return {
        "logs": [
            {"id": l.id, "phone": l.phone, "message": l.message[:80],
             "region": l.region, "status": l.status,
             "sent_at": l.sent_at.isoformat()}
            for l in logs
        ]
    }

@router.get("/test")
async def test_connection():
    """Test whether Beem credentials are configured."""
    if BEEM_API_KEY and BEEM_SECRET_KEY:
        return {"configured": True, "sender": BEEM_SENDER_NAME}
    return {"configured": False, "error": "BEEM_API_KEY or BEEM_SECRET_KEY not set"}
