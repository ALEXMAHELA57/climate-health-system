from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from database import get_db, User, FamilyProfile, MenstrualPeriod, MenstrualLog
from app.routers.auth import get_current_user

router = APIRouter()

DEFAULT_CYCLE_LENGTH = 28
DEFAULT_PERIOD_LENGTH = 5
LUTEAL_PHASE_DAYS = 14  # days between ovulation and next period - fairly consistent across cycle lengths

def verify_family_access(family_profile_id: Optional[int], user: User, db: Session) -> bool:
    if not family_profile_id:
        return True
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == family_profile_id, FamilyProfile.managed_by_user_id == user.id, FamilyProfile.active == True).first()
    return profile is not None

class PeriodIn(BaseModel):
    family_profile_id: Optional[int] = None
    start_date: str
    end_date: Optional[str] = None

class LogIn(BaseModel):
    family_profile_id: Optional[int] = None
    date: str
    flow: Optional[str] = None
    cramps: Optional[str] = None
    mood: Optional[str] = None
    notes: Optional[str] = ""

@router.post("/periods")
def log_period(data: PeriodIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(data.family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}
    period = MenstrualPeriod(owner_user_id=user.id, family_profile_id=data.family_profile_id, start_date=data.start_date, end_date=data.end_date)
    db.add(period)
    db.commit()
    return {"success": True, "period_id": period.id}

@router.get("/periods")
def list_periods(family_profile_id: Optional[int] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(MenstrualPeriod).filter(MenstrualPeriod.owner_user_id == user.id)
    q = q.filter(MenstrualPeriod.family_profile_id == family_profile_id) if family_profile_id else q.filter(MenstrualPeriod.family_profile_id.is_(None))
    periods = q.order_by(MenstrualPeriod.start_date.desc()).all()
    return {"periods": [{"id": p.id, "start_date": p.start_date, "end_date": p.end_date} for p in periods]}

@router.delete("/periods/{period_id}")
def delete_period(period_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    period = db.query(MenstrualPeriod).filter(MenstrualPeriod.id == period_id, MenstrualPeriod.owner_user_id == user.id).first()
    if not period:
        return {"success": False, "error": "Period not found"}
    db.delete(period)
    db.commit()
    return {"success": True}

@router.get("/summary")
def get_summary(family_profile_id: Optional[int] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}
    q = db.query(MenstrualPeriod).filter(MenstrualPeriod.owner_user_id == user.id)
    q = q.filter(MenstrualPeriod.family_profile_id == family_profile_id) if family_profile_id else q.filter(MenstrualPeriod.family_profile_id.is_(None))
    periods = sorted(q.all(), key=lambda p: p.start_date)

    if not periods:
        return {"success": True, "has_data": False}

    starts = [date.fromisoformat(p.start_date) for p in periods]
    most_recent = starts[-1]

    if len(starts) >= 2:
        gaps = [(starts[i] - starts[i-1]).days for i in range(1, len(starts))]
        avg_cycle_length = round(sum(gaps) / len(gaps))
        avg_cycle_length = max(21, min(45, avg_cycle_length))  # sanity bounds for irregular data entry
    else:
        avg_cycle_length = DEFAULT_CYCLE_LENGTH

    today = date.today()
    cycle_day = (today - most_recent).days + 1
    predicted_next = most_recent + timedelta(days=avg_cycle_length)
    predicted_ovulation = predicted_next - timedelta(days=LUTEAL_PHASE_DAYS)
    fertile_start = predicted_ovulation - timedelta(days=5)
    fertile_end = predicted_ovulation + timedelta(days=1)

    # Flag irregularity if cycle lengths vary a lot - useful signal, ties back
    # to the PCOS-screening discussion without diagnosing anything ourselves
    irregular = False
    if len(starts) >= 3:
        gaps = [(starts[i] - starts[i-1]).days for i in range(1, len(starts))]
        irregular = (max(gaps) - min(gaps)) > 10

    return {
        "success": True, "has_data": True,
        "cycle_day": cycle_day,
        "avg_cycle_length": avg_cycle_length,
        "last_period_start": most_recent.isoformat(),
        "predicted_next_period": predicted_next.isoformat(),
        "days_until_next_period": (predicted_next - today).days,
        "predicted_ovulation": predicted_ovulation.isoformat(),
        "fertile_window": {"start": fertile_start.isoformat(), "end": fertile_end.isoformat()},
        "is_in_fertile_window": fertile_start <= today <= fertile_end,
        "irregular_cycles": irregular,
    }

@router.post("/logs")
def log_symptom(data: LogIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(data.family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}
    log = MenstrualLog(
        owner_user_id=user.id, family_profile_id=data.family_profile_id, date=data.date,
        flow=data.flow, cramps=data.cramps, mood=data.mood, notes=data.notes,
    )
    db.add(log)
    db.commit()
    return {"success": True, "log_id": log.id}

@router.get("/logs")
def list_logs(family_profile_id: Optional[int] = None, days: int = 60, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    since = (date.today() - timedelta(days=days)).isoformat()
    q = db.query(MenstrualLog).filter(MenstrualLog.owner_user_id == user.id, MenstrualLog.date >= since)
    q = q.filter(MenstrualLog.family_profile_id == family_profile_id) if family_profile_id else q.filter(MenstrualLog.family_profile_id.is_(None))
    logs = q.order_by(MenstrualLog.date.desc()).all()
    return {"logs": [{"id": l.id, "date": l.date, "flow": l.flow, "cramps": l.cramps, "mood": l.mood, "notes": l.notes} for l in logs]}
