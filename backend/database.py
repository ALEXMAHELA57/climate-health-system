from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Add SSL and pooler-compatible settings
connect_args = {"sslmode": "require"} if DATABASE_URL.startswith("postgresql") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=False,
    pool_recycle=300
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ── Tables ────────────────────────────────────────────────────────────────────

class Subscriber(Base):
    __tablename__ = "subscribers"
    id          = Column(Integer, primary_key=True, index=True)
    phone       = Column(String(20), unique=True, index=True)
    region      = Column(String(100))
    language    = Column(String(5), default="en")
    active      = Column(Boolean, default=True)
    subscribed_at = Column(DateTime, default=datetime.utcnow)

class CommunityReport(Base):
    __tablename__ = "community_reports"
    id          = Column(Integer, primary_key=True, index=True)
    report_id   = Column(String(20), unique=True, index=True)
    type        = Column(String(100))
    region      = Column(String(100))
    district    = Column(String(100))
    street      = Column(String(200))
    details     = Column(Text, default="")
    severity    = Column(String(20), default="medium")
    language    = Column(String(5), default="en")
    status      = Column(String(20), default="under_review")
    admin_note  = Column(Text, default="")
    timestamp   = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SymptomReport(Base):
    __tablename__ = "symptom_reports"
    id             = Column(Integer, primary_key=True, index=True)
    region         = Column(String(100))
    symptoms       = Column(Text)
    timestamp      = Column(DateTime, default=datetime.utcnow)
    flagged_severe = Column(Boolean, default=False)

class SMSLog(Base):
    __tablename__ = "sms_logs"
    id          = Column(Integer, primary_key=True, index=True)
    phone       = Column(String(20))
    message     = Column(Text)
    region      = Column(String(100))
    status      = Column(String(20), default="sent")
    sent_at     = Column(DateTime, default=datetime.utcnow)

class OutbreakAlert(Base):
    """Tracks the approval state of a detected outbreak for a given
    region + disease combination. The detection logic runs live against
    SymptomReport data; this table records whether an admin has approved
    that detection for public display, or whether it's pending/rejected."""
    __tablename__ = "outbreak_alerts"
    id          = Column(Integer, primary_key=True, index=True)
    region      = Column(String(100), index=True)
    disease     = Column(String(100))
    risk        = Column(String(20))           # low | medium | high | emergency
    confidence  = Column(Float, default=0.0)
    reports_3day = Column(Integer, default=0)
    reports_7day = Column(Integer, default=0)
    status      = Column(String(20), default="pending")  # pending | approved | rejected
    admin_note  = Column(Text, default="")
    detected_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

class SystemSetting(Base):
    """Simple key-value store for admin-configurable system settings,
    e.g. whether outbreak alerts auto-publish or require approval."""
    __tablename__ = "system_settings"
    key         = Column(String(100), primary_key=True)
    value       = Column(String(500))
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Doctor(Base):
    """A doctor available for consultation through AfyaHewa. Specialty
    drives which category a doctor shows up under (general, reproductive
    health, palliative care, mental health/psychology)."""
    __tablename__ = "doctors"
    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String(200))
    specialty           = Column(String(50), index=True)   # general | reproductive_health | palliative_care | mental_health
    bio                 = Column(Text, default="")
    phone               = Column(String(20))
    consultation_types  = Column(String(100), default="chat")  # comma list: chat,voice,video
    available_days      = Column(String(100), default="Mon,Tue,Wed,Thu,Fri")
    available_hours     = Column(String(50), default="09:00-17:00")
    active              = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

class Appointment(Base):
    """A patient's booked (or requested) consultation with a doctor."""
    __tablename__ = "appointments"
    id                  = Column(Integer, primary_key=True, index=True)
    appointment_id      = Column(String(20), unique=True, index=True)
    doctor_id           = Column(Integer, index=True)
    patient_name        = Column(String(200))
    patient_phone       = Column(String(20), index=True)
    specialty           = Column(String(50))
    reason              = Column(Text, default="")
    requested_date      = Column(String(20))   # "YYYY-MM-DD"
    requested_time      = Column(String(10))   # "HH:MM"
    consultation_type   = Column(String(20), default="chat")
    status              = Column(String(20), default="pending")  # pending | confirmed | completed | cancelled
    language             = Column(String(5), default="en")
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MedicineReminder(Base):
    """A patient's medicine schedule. times is a comma-separated list of
    HH:MM slots (e.g. '08:00,14:00,20:00'). The scheduler checks this
    every minute and fires an SMS (and the mobile app fires a local
    alarm-style notification) when a scheduled time is reached."""
    __tablename__ = "medicine_reminders"
    id                  = Column(Integer, primary_key=True, index=True)
    reminder_id         = Column(String(20), unique=True, index=True)
    patient_phone       = Column(String(20), index=True)
    medicine_name       = Column(String(200))
    dosage              = Column(String(100), default="")
    times               = Column(String(200))   # "08:00,14:00,20:00"
    start_date          = Column(String(20))    # "YYYY-MM-DD"
    end_date            = Column(String(20), nullable=True)
    active              = Column(Boolean, default=True)
    sms_fallback        = Column(Boolean, default=True)  # also send SMS at reminder time
    language            = Column(String(5), default="en")
    created_at          = Column(DateTime, default=datetime.utcnow)

class ReminderLog(Base):
    """Records each time a reminder's SMS fallback was actually sent, so
    the scheduler never double-sends within the same day/time slot."""
    __tablename__ = "reminder_logs"
    id             = Column(Integer, primary_key=True, index=True)
    reminder_id    = Column(String(20), index=True)
    date           = Column(String(20))   # "YYYY-MM-DD"
    scheduled_time = Column(String(10))   # "HH:MM"
    sent_at        = Column(DateTime, default=datetime.utcnow)

# ── Create all tables ─────────────────────────────────────────────────────────
def init_db():
    Base.metadata.create_all(bind=engine)

# ── Dependency for routes ─────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
