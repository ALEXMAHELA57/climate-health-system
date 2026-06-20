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
