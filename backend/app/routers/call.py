"""Shared helper for real video/voice doctor calls, backed by Daily.co.

Both the patient app (consultation.py, via get_current_user) and the
Doctor Portal (doctor.py, via get_current_doctor) call get_or_create_call()
below to get a room + a personal join token for a confirmed, paid
voice/video appointment. Neither router owns this logic so both stay
in sync on room naming, expiry, and access rules.

This file also owns call *signaling* (router below): a tiny per-user
WebSocket channel used to ring the other party the instant someone starts
a call, and to tell the caller if it was declined - so a call is a normal
"ring, then accept/decline" phone call instead of both sides having to
separately notice a Join Call button and click it at the same time.
"""
import os
import jwt
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from database import Appointment

DAILY_API_KEY = os.getenv("DAILY_API_KEY", "")
DAILY_API_BASE = "https://api.daily.co/v1"


class CallError(Exception):
    pass


async def _daily_request(method: str, path: str, json_body: dict = None) -> dict:
    if not DAILY_API_KEY:
        raise CallError("Video/voice calling is not configured on this server")
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.request(
            method, f"{DAILY_API_BASE}{path}",
            headers={"Authorization": f"Bearer {DAILY_API_KEY}", "Content-Type": "application/json"},
            json=json_body,
        )
    if res.status_code >= 400:
        raise CallError(f"Daily.co error ({res.status_code}): {res.text[:200]}")
    return res.json()


def _room_name(appt: Appointment) -> str:
    # Daily room names are limited to letters, numbers, dashes/underscores.
    return f"afyahewa-{appt.appointment_id}".lower()


async def get_or_create_call(appt: Appointment, db: Session, *, is_doctor: bool, identity_name: str) -> dict:
    """Ensures a Daily.co room exists for this appointment and returns a
    fresh, single-use join token for the caller (patient or doctor).
    Only permitted for confirmed, paid voice/video appointments."""
    if appt.consultation_type not in ("voice", "video"):
        raise CallError("This appointment isn't a voice or video consultation")
    if appt.status != "confirmed" or appt.payment_status != "paid":
        raise CallError("This appointment isn't confirmed and paid yet")

    if not appt.call_room_url:
        room_name = _room_name(appt)
        # Room expires 4 hours after creation - long enough to cover a late
        # start without leaving rooms open indefinitely.
        exp = int((datetime.utcnow() + timedelta(hours=4)).timestamp())
        room = await _daily_request("POST", "/rooms", {
            "name": room_name,
            "privacy": "private",
            "properties": {
                "exp": exp,
                "enable_screenshare": True,
                "enable_chat": True,
                "start_video_off": appt.consultation_type == "voice",
                "start_audio_off": False,
                "max_participants": 2,
                # Skip Daily's device-check/"prejoin" screen (camera/mic
                # pickers, etc.) - patients and doctors should land straight
                # in the call, like a normal phone/WhatsApp call, not a video
                # conferencing app's setup screen.
                "enable_prejoin_ui": False,
                "enable_network_ui": False,
                "enable_people_ui": False,
            },
        })
        appt.call_room_url = room["url"]
        db.commit()
        db.refresh(appt)

    room_name = _room_name(appt)
    token_exp = int((datetime.utcnow() + timedelta(hours=4)).timestamp())
    token = await _daily_request("POST", "/meeting-tokens", {
        "properties": {
            "room_name": room_name,
            "user_name": identity_name,
            "is_owner": is_doctor,  # doctor can end the call for everyone
            "exp": token_exp,
        },
    })

    return {
        "room_url": appt.call_room_url,
        "token": token["token"],
        "consultation_type": appt.consultation_type,
    }


# ── Call signaling: ring / accept / decline ─────────────────────────────────
# A lightweight, separate WebSocket (not the Daily.co call itself) that each
# logged-in patient and doctor keeps open in the background the whole time
# they're using the app, so they can be "rung" no matter what screen they're
# on - the same way a phone call interrupts whatever else you're doing.

router = APIRouter()


def _identify(token: str) -> Tuple[Optional[str], Optional[int]]:
    """Decode a JWT (patient or doctor) and return (role, id) or (None, None).
    Imported lazily from auth to avoid a circular import at module load."""
    from app.routers.auth import JWT_SECRET, JWT_ALGO
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.InvalidTokenError:
        return None, None
    if payload.get("type") == "doctor":
        return "doctor", payload.get("doctor_id")
    return "patient", payload.get("user_id")


def _other_party(appt: Appointment, role: str) -> Tuple[Optional[str], Optional[int]]:
    """Who should be rung/notified for the OTHER side of this appointment."""
    if role == "doctor":
        if appt.owner_user_id is None:
            return None, None  # legacy phone-only booking - no account to ring
        return "patient", appt.owner_user_id
    return "doctor", appt.doctor_id


class CallSignalManager:
    def __init__(self):
        self.conns: Dict[Tuple[str, int], List[WebSocket]] = {}

    async def connect(self, role: str, uid: int, ws: WebSocket):
        await ws.accept()
        self.conns.setdefault((role, uid), []).append(ws)

    def disconnect(self, role: str, uid: int, ws: WebSocket):
        lst = self.conns.get((role, uid), [])
        self.conns[(role, uid)] = [w for w in lst if w != ws]

    async def send(self, role: str, uid: int, message: dict):
        for ws in list(self.conns.get((role, uid), [])):
            try:
                await ws.send_json(message)
            except Exception:
                pass


signal_manager = CallSignalManager()

# Best-effort fallback for decline/cancel, in case the WebSocket push above
# is missed - e.g. the caller's own "listen for decline" socket is still
# mid-handshake (slow network, a backend that just cold-started) at the
# instant the other side taps Decline, so there's nothing connected yet to
# push to and the message is silently dropped. Rather than retry/queue on
# the WebSocket itself, the declining/cancelling side also stamps a tiny
# in-memory record here that the caller's screen can poll as a safety net.
_last_signal: Dict[str, Dict[str, float]] = {}  # appointment_id -> {"type": ..., "ts": ...}
_SIGNAL_TTL_SECONDS = 180


def _record_signal(appointment_id: str, signal_type: str):
    import time
    _last_signal[str(appointment_id)] = {"type": signal_type, "ts": time.time()}


async def notify_incoming_call(appt: Appointment, from_role: str, caller_name: str):
    """Ring the OTHER party that a call is starting for this appointment."""
    target_role, target_id = _other_party(appt, from_role)
    if not target_role:
        return
    await signal_manager.send(target_role, target_id, {
        "type": "incoming_call",
        "appointment_id": appt.appointment_id,
        "consultation_type": appt.consultation_type,
        "caller_name": caller_name,
    })


async def notify_call_declined(appt: Appointment, declining_role: str):
    """Tell the caller their call was declined, if they're connected."""
    _record_signal(appt.appointment_id, "declined")
    target_role, target_id = _other_party(appt, declining_role)
    if not target_role:
        return
    await signal_manager.send(target_role, target_id, {
        "type": "call_declined",
        "appointment_id": appt.appointment_id,
    })


async def notify_call_cancelled(appt: Appointment, cancelling_role: str):
    """Tell the callee the caller hung up before anyone answered, so their
    Incoming Call screen dismisses instead of ringing until it times out."""
    _record_signal(appt.appointment_id, "cancelled")
    target_role, target_id = _other_party(appt, cancelling_role)
    if not target_role:
        return
    await signal_manager.send(target_role, target_id, {
        "type": "call_cancelled",
        "appointment_id": appt.appointment_id,
    })


@router.get("/{appointment_id}/status")
async def call_signal_status(appointment_id: str):
    """Polling fallback for the WebSocket push above. CallRoom polls this
    every couple of seconds while it's ringing, so a decline/cancel still
    gets through within a couple of seconds even if the push was missed."""
    import time
    entry = _last_signal.get(str(appointment_id))
    if not entry or (time.time() - entry["ts"]) > _SIGNAL_TTL_SECONDS:
        return {"declined": False, "cancelled": False}
    return {
        "declined": entry["type"] == "declined",
        "cancelled": entry["type"] == "cancelled",
    }


@router.websocket("/ws")
async def call_signal_ws(websocket: WebSocket, token: str = Query(...)):
    role, uid = _identify(token)
    if not role or not uid:
        await websocket.close(code=4401)
        return
    await signal_manager.connect(role, uid, websocket)
    try:
        while True:
            # Nothing is expected from the client - this is a one-way ring
            # channel. receive() just lets us detect disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        signal_manager.disconnect(role, uid, websocket)
    except Exception:
        signal_manager.disconnect(role, uid, websocket)
