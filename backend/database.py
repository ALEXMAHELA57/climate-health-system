from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

engine = create_engine(DATABASE_URL)
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
    id          = Column(Integer, primary_key=True, index=True)
    region      = Column(String(100))
    symptoms    = Column(Text)
    timestamp   = Column(DateTime, default=datetime.utcnow)

class SMSLog(Base):
    __tablename__ = "sms_logs"
    id          = Column(Integer, primary_key=True, index=True)
    phone       = Column(String(20))
    message     = Column(Text)
    region      = Column(String(100))
    status      = Column(String(20), default="sent")
    sent_at     = Column(DateTime, default=datetime.utcnow)

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
