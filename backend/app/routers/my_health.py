from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from database import get_db, User, FamilyProfile, MedicalRecord, HealthMeasurement, MedicineReminder, Appointment, MeasurementReminder
from app.routers.auth import get_current_user
import random
import string

def gen_id(prefix: str) -> str:
    return prefix + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

router = APIRouter()

# Sensible reference ranges for flagging an out-of-range reading. These are
# general population defaults, not personalized targets from a doctor -
# see the honest note on this in the roadmap.
NORMAL_RANGES = {
    "blood_pressure": {"low": (0, 90), "high": (140, 999)},      # systolic
    "blood_glucose":  {"low": (0, 70), "high": (180, 999)},       # mg/dL, general non-fasting reference
    "heart_rate":     {"low": (0, 50), "high": (120, 999)},
    "temperature":    {"low": (0, 35), "high": (38, 999)},        # Celsius
    "spo2":           {"low": (0, 94), "high": (101, 999)},
}

def flag_reading(metric_type: str, value_primary: float) -> Optional[str]:
    r = NORMAL_RANGES.get(metric_type)
    if not r: return None
    if r["low"][0] <= value_primary < r["low"][1]: return "low"
    if r["high"][0] <= value_primary <= r["high"][1]: return "high"
    return None

def verify_family_access(family_profile_id: Optional[int], user: User, db: Session) -> bool:
    """Only the account holder managing a family profile can add/view records for it."""
    if not family_profile_id:
        return True
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == family_profile_id, FamilyProfile.managed_by_user_id == user.id, FamilyProfile.active == True).first()
    return profile is not None

# ── Request models ───────────────────────────────────────────────────────

class RecordIn(BaseModel):
    family_profile_id: Optional[int] = None
    record_type: str  # condition | diagnosis | prescription | lab_result | allergy | document
    title: str
    description: Optional[str] = ""
    date_recorded: Optional[str] = None

class MeasurementIn(BaseModel):
    family_profile_id: Optional[int] = None
    metric_type: str
    value_primary: float
    value_secondary: Optional[float] = None
    unit: Optional[str] = ""
    context: Optional[str] = None
    note: Optional[str] = ""

class MeasurementReminderIn(BaseModel):
    family_profile_id: Optional[int] = None
    metric_type: str
    times: list[str]
    start_date: str
    end_date: Optional[str] = None
    sms_fallback: Optional[bool] = True
    language: Optional[str] = "en"

# ── Medical Records ──────────────────────────────────────────────────────

@router.post("/records")
def add_record(data: RecordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(data.family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}
    record = MedicalRecord(
        owner_user_id=user.id, family_profile_id=data.family_profile_id,
        record_type=data.record_type, title=data.title, description=data.description,
        source="self_reported",  # records created through this endpoint are always self-reported;
                                  # verified_afyahewa records are created internally once consultations/lab results feed in here
        date_recorded=data.date_recorded,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"success": True, "record_id": record.id}

@router.get("/records")
def list_records(family_profile_id: Optional[int] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(family_profile_id, user, db):
        return {"records": []}
    q = db.query(MedicalRecord).filter(MedicalRecord.owner_user_id == user.id)
    q = q.filter(MedicalRecord.family_profile_id == family_profile_id) if family_profile_id else q.filter(MedicalRecord.family_profile_id.is_(None))
    records = q.order_by(MedicalRecord.created_at.desc()).all()
    return {"records": [{
        "id": r.id, "record_type": r.record_type, "title": r.title, "description": r.description,
        "source": r.source, "date_recorded": r.date_recorded, "created_at": r.created_at.isoformat(),
    } for r in records]}

@router.delete("/records/{record_id}")
def delete_record(record_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id, MedicalRecord.owner_user_id == user.id).first()
    if not record:
        return {"success": False, "error": "Record not found"}
    db.delete(record)
    db.commit()
    return {"success": True}

# ── Health Measurements ──────────────────────────────────────────────────

@router.post("/measurements")
def add_measurement(data: MeasurementIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(data.family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}
    m = HealthMeasurement(
        owner_user_id=user.id, family_profile_id=data.family_profile_id,
        metric_type=data.metric_type, value_primary=data.value_primary, value_secondary=data.value_secondary,
        unit=data.unit, context=data.context, note=data.note,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    flag = flag_reading(data.metric_type, data.value_primary)
    return {"success": True, "measurement_id": m.id, "flag": flag}

@router.get("/measurements")
def list_measurements(family_profile_id: Optional[int] = None, metric_type: Optional[str] = None, days: int = 30,
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(family_profile_id, user, db):
        return {"measurements": []}
    since = datetime.utcnow() - timedelta(days=days)
    q = db.query(HealthMeasurement).filter(HealthMeasurement.owner_user_id == user.id, HealthMeasurement.recorded_at >= since)
    q = q.filter(HealthMeasurement.family_profile_id == family_profile_id) if family_profile_id else q.filter(HealthMeasurement.family_profile_id.is_(None))
    if metric_type:
        q = q.filter(HealthMeasurement.metric_type == metric_type)
    measurements = q.order_by(HealthMeasurement.recorded_at.desc()).all()
    return {"measurements": [{
        "id": m.id, "metric_type": m.metric_type, "value_primary": m.value_primary, "value_secondary": m.value_secondary,
        "unit": m.unit, "context": m.context, "note": m.note, "recorded_at": m.recorded_at.isoformat(),
        "flag": flag_reading(m.metric_type, m.value_primary),
    } for m in measurements]}

# ── Combined Report ──────────────────────────────────────────────────────

def _build_report_data(family_profile_id: Optional[int], days: int, user: User, db: Session):
    since = datetime.utcnow() - timedelta(days=days)

    m_q = db.query(HealthMeasurement).filter(HealthMeasurement.owner_user_id == user.id, HealthMeasurement.recorded_at >= since)
    m_q = m_q.filter(HealthMeasurement.family_profile_id == family_profile_id) if family_profile_id else m_q.filter(HealthMeasurement.family_profile_id.is_(None))
    measurements = m_q.order_by(HealthMeasurement.recorded_at.desc()).all()

    by_metric = {}
    for m in measurements:
        by_metric.setdefault(m.metric_type, []).append({
            "value_primary": m.value_primary, "value_secondary": m.value_secondary,
            "recorded_at": m.recorded_at.isoformat(), "flag": flag_reading(m.metric_type, m.value_primary),
        })

    reminders = db.query(MedicineReminder).filter(MedicineReminder.active == True)
    reminders = reminders.filter(MedicineReminder.family_profile_id == family_profile_id).all() if family_profile_id \
        else reminders.filter(MedicineReminder.patient_phone == user.phone).all() if user.phone else []

    phone_for_appts = None
    if family_profile_id:
        profile = db.query(FamilyProfile).filter(FamilyProfile.id == family_profile_id).first()
        phone_for_appts = profile.phone if profile else None
    else:
        phone_for_appts = user.phone
    appointments = db.query(Appointment).filter(Appointment.patient_phone == phone_for_appts).filter(Appointment.created_at >= since).all() if phone_for_appts else []

    return {
        "period_days": days,
        "measurements_by_metric": by_metric,
        "active_medications": [{"medicine_name": r.medicine_name, "dosage": r.dosage, "times": r.times.split(",")} for r in reminders],
        "appointments": [{"specialty": a.specialty, "status": a.status, "requested_date": a.requested_date} for a in appointments],
    }

@router.get("/report")
def get_report(family_profile_id: Optional[int] = None, days: int = 30,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """A combined summary for a period - measurements, active medications,
    and appointments - the kind of thing worth bringing to a doctor visit."""
    if not verify_family_access(family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}
    return {"success": True, **_build_report_data(family_profile_id, days, user, db)}

@router.get("/report/pdf")
def get_report_pdf(family_profile_id: Optional[int] = None, days: int = 30,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Same report, rendered as a downloadable PDF - meant to be brought
    to a doctor visit."""
    if not verify_family_access(family_profile_id, user, db):
        return Response(content="Not authorized", status_code=403)
    data = _build_report_data(family_profile_id, days, user, db)

    subject_name = user.name or "AfyaHewa User"
    if family_profile_id:
        profile = db.query(FamilyProfile).filter(FamilyProfile.id == family_profile_id).first()
        subject_name = profile.name if profile else subject_name

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleX', parent=styles['Title'], textColor=colors.HexColor('#1e3a8a'))
    heading_style = ParagraphStyle('HeadingX', parent=styles['Heading2'], textColor=colors.HexColor('#2563eb'), spaceBefore=14, spaceAfter=6)

    elements = [
        Paragraph("AfyaHewa Health Report", title_style),
        Paragraph(f"{subject_name} — last {data['period_days']} days — generated {datetime.utcnow().strftime('%Y-%m-%d')}", styles['Normal']),
        Spacer(1, 10*mm),
    ]

    elements.append(Paragraph("Measurements", heading_style))
    if not data["measurements_by_metric"]:
        elements.append(Paragraph("No measurements logged in this period.", styles['Normal']))
    else:
        for metric, readings in data["measurements_by_metric"].items():
            rows = [["Date", "Reading", "Flag"]]
            for r in readings[:15]:
                val = f"{r['value_primary']}/{r['value_secondary']}" if r['value_secondary'] else str(r['value_primary'])
                rows.append([r['recorded_at'][:10], val, r['flag'] or "-"])
            elements.append(Paragraph(metric.replace('_', ' ').title(), styles['Heading3']))
            t = Table(rows, colWidths=[50*mm, 50*mm, 30*mm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eff6ff')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
                ('FONTSIZE', (0,0), (-1,-1), 9),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 4*mm))

    elements.append(Paragraph("Active Medications", heading_style))
    if not data["active_medications"]:
        elements.append(Paragraph("None on file.", styles['Normal']))
    else:
        for m in data["active_medications"]:
            dosage_txt = f" ({m['dosage']})" if m['dosage'] else ""
            elements.append(Paragraph(f"• {m['medicine_name']}{dosage_txt} — {', '.join(m['times'])}", styles['Normal']))

    elements.append(Paragraph("Appointments", heading_style))
    if not data["appointments"]:
        elements.append(Paragraph("None in this period.", styles['Normal']))
    else:
        for a in data["appointments"]:
            elements.append(Paragraph(f"• {a['specialty']} — {a['status']} ({a['requested_date']})", styles['Normal']))

    doc.build(elements)
    pdf_bytes = buf.getvalue()
    buf.close()

    filename = f"AfyaHewa_Health_Report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ── Measurement Reminders - same pattern as Medicine Reminders ───────────────

@router.post("/measurement-reminders")
def create_measurement_reminder(data: MeasurementReminderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_family_access(data.family_profile_id, user, db):
        return {"success": False, "error": "You don't manage this family profile"}
    on_behalf_of_name = None
    if data.family_profile_id:
        profile = db.query(FamilyProfile).filter(FamilyProfile.id == data.family_profile_id).first()
        on_behalf_of_name = profile.name if profile else None

    rid = gen_id("MSR")
    reminder = MeasurementReminder(
        reminder_id=rid, patient_phone=user.phone or "", family_profile_id=data.family_profile_id,
        on_behalf_of_name=on_behalf_of_name, metric_type=data.metric_type, times=",".join(data.times),
        start_date=data.start_date, end_date=data.end_date, sms_fallback=data.sms_fallback,
        language=data.language, active=True,
    )
    db.add(reminder)
    db.commit()
    return {"success": True, "reminder_id": rid}

@router.get("/measurement-reminders")
def list_measurement_reminders(family_profile_id: Optional[int] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(MeasurementReminder).filter(MeasurementReminder.patient_phone == user.phone, MeasurementReminder.active == True)
    q = q.filter(MeasurementReminder.family_profile_id == family_profile_id) if family_profile_id else q.filter(MeasurementReminder.family_profile_id.is_(None))
    reminders = q.all()
    return {"reminders": [{
        "reminder_id": r.reminder_id, "metric_type": r.metric_type, "times": r.times.split(","),
        "start_date": r.start_date, "end_date": r.end_date, "on_behalf_of_name": r.on_behalf_of_name,
    } for r in reminders]}

@router.delete("/measurement-reminders/{reminder_id}")
def delete_measurement_reminder(reminder_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reminder = db.query(MeasurementReminder).filter(MeasurementReminder.reminder_id == reminder_id, MeasurementReminder.patient_phone == user.phone).first()
    if not reminder:
        return {"success": False, "error": "Reminder not found"}
    reminder.active = False
    db.commit()
    return {"success": True}
