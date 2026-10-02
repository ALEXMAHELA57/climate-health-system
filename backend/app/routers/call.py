"""Shared helper for real video/voice doctor calls, backed by Daily.co.

Both the patient app (consultation.py, via get_current_user) and the
Doctor Portal (doctor.py, via get_current_doctor) call get_or_create_call()
below to get a room + a personal join token for a confirmed, paid
voice/video appointment. Neither router owns this logic so both stay
in sync on room naming, expiry, and access rules.
"""
import os
import httpx
from datetime import datetime, timedelta
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
