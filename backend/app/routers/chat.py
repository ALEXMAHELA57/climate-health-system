from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from typing import Dict, List, Tuple
from sqlalchemy.orm import Session
import jwt

from database import get_db, SessionLocal, User, Doctor, Appointment, ChatMessage
from app.routers.auth import JWT_SECRET, JWT_ALGO

router = APIRouter()

class MessageIn(BaseModel):
    text: str

def identify_sender(token: str, db: Session):
    """Decode a JWT (patient or doctor) and return (sender_type, id) or (None, None)."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.InvalidTokenError:
        return None, None
    if payload.get("type") == "doctor":
        return "doctor", payload.get("doctor_id")
    return "patient", payload.get("user_id")

def verify_access(appointment_id: str, sender_type: str, sender_id: int, db: Session) -> bool:
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not appt:
        return False
    if sender_type == "doctor":
        return appt.doctor_id == sender_id
    user = db.query(User).filter(User.id == sender_id).first()
    return bool(user and user.phone and user.phone == appt.patient_phone)

# ── REST: history + fallback send ─────────────────────────────────────────

@router.get("/{appointment_id}/messages")
def get_messages(appointment_id: str, token: str = Query(...), db: Session = Depends(get_db)):
    sender_type, sender_id = identify_sender(token, db)
    if not sender_type or not verify_access(appointment_id, sender_type, sender_id, db):
        return {"success": False, "error": "Not authorized for this conversation"}
    messages = db.query(ChatMessage).filter(ChatMessage.appointment_id == appointment_id).order_by(ChatMessage.created_at.asc()).all()
    return {"messages": [{"sender_type": m.sender_type, "text": m.text, "created_at": m.created_at.isoformat()} for m in messages]}

# ── WebSocket: real-time delivery ─────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[Tuple[WebSocket, str]]] = {}

    async def connect(self, appointment_id: str, ws: WebSocket, sender_type: str):
        await ws.accept()
        self.rooms.setdefault(appointment_id, []).append((ws, sender_type))

    def disconnect(self, appointment_id: str, ws: WebSocket):
        conns = self.rooms.get(appointment_id, [])
        self.rooms[appointment_id] = [(w, t) for (w, t) in conns if w != ws]

    def other_party_connected(self, appointment_id: str, sender_type: str) -> bool:
        other = "doctor" if sender_type == "patient" else "patient"
        return any(t == other for (_, t) in self.rooms.get(appointment_id, []))

    async def broadcast(self, appointment_id: str, message: dict):
        for ws, _ in self.rooms.get(appointment_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.websocket("/ws/{appointment_id}")
async def chat_ws(websocket: WebSocket, appointment_id: str, token: str = Query(...)):
    db = SessionLocal()
    try:
        sender_type, sender_id = identify_sender(token, db)
        if not sender_type or not verify_access(appointment_id, sender_type, sender_id, db):
            await websocket.close(code=4401)
            return

        await manager.connect(appointment_id, websocket, sender_type)
        try:
            while True:
                data = await websocket.receive_json()
                text = (data.get("text") or "").strip()
                if not text:
                    continue

                msg = ChatMessage(appointment_id=appointment_id, sender_type=sender_type, text=text)
                db.add(msg)
                db.commit()
                db.refresh(msg)

                await manager.broadcast(appointment_id, {
                    "sender_type": sender_type, "text": text, "created_at": msg.created_at.isoformat(),
                })

                # SMS fallback if the other party isn't currently connected
                if not manager.other_party_connected(appointment_id, sender_type):
                    await notify_offline_party(appointment_id, sender_type, db)
        except WebSocketDisconnect:
            manager.disconnect(appointment_id, websocket)
    finally:
        db.close()

async def notify_offline_party(appointment_id: str, sender_type: str, db: Session):
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not appt:
        return
    try:
        from sms import send_beem_sms, normalize_phone
        if sender_type == "patient":
            doctor = db.query(Doctor).filter(Doctor.id == appt.doctor_id).first()
            if doctor and doctor.phone:
                message = f"AfyaHewa: New message from {appt.patient_name} about your {appt.requested_date} appointment. Log in to reply."
                await send_beem_sms([{"recipient_id": "1", "dest_addr": normalize_phone(doctor.phone)}], message[:160])
        else:
            if appt.patient_phone:
                message = f"AfyaHewa: You have a new message from your doctor. Log in to the app to reply."
                await send_beem_sms([{"recipient_id": "1", "dest_addr": normalize_phone(appt.patient_phone)}], message[:160])
    except Exception as e:
        print(f"[chat] SMS notification failed: {e}")
