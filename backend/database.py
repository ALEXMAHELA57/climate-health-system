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

class User(Base):
    """A registered AfyaHewa account. Signup order (agreed): language,
    then phone or email, then verification, then name, date of birth,
    and gender. Date of birth is exact (not an age bracket) - used both
    to gate under-18s away from independent accounts (redirected to a
    guardian-managed Family Health profile instead) and for age-specific
    health guidance (screening ages, risk assessments)."""
    __tablename__ = "users"
    id             = Column(Integer, primary_key=True, index=True)
    phone          = Column(String(20), unique=True, index=True, nullable=True)
    email          = Column(String(200), unique=True, index=True, nullable=True)
    password_hash  = Column(String(200), nullable=True)  # only set for email accounts
    name           = Column(String(200), nullable=True)
    date_of_birth  = Column(String(10), nullable=True)    # "YYYY-MM-DD"
    gender         = Column(String(20), nullable=True)     # male | female | other
    language       = Column(String(5), default="en")
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    active         = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

class OTPCode(Base):
    """One-time codes sent via Beem SMS for phone signup/login."""
    __tablename__ = "otp_codes"
    id          = Column(Integer, primary_key=True, index=True)
    phone       = Column(String(20), index=True)
    code        = Column(String(10))
    purpose     = Column(String(20), default="login")  # signup | login
    expires_at  = Column(DateTime)
    used        = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

class EmailVerificationToken(Base):
    """Tokens emailed via Resend to verify an email-based account."""
    __tablename__ = "email_verification_tokens"
    id          = Column(Integer, primary_key=True, index=True)
    email       = Column(String(200), index=True)
    token       = Column(String(64), unique=True, index=True)
    purpose     = Column(String(20), default="verify")  # verify | reset_password
    expires_at  = Column(DateTime)
    used        = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

class FamilyProfile(Base):
    """A family member managed under a primary account holder. Children
    (under 18) are always pure sub-profiles with no login of their own.
    Adults can also be added this way if they don't want their own
    account, but require an explicit consent confirmation at creation
    time. An adult who *does* want their own account instead gets
    linked via FamilyLinkRequest, and linked_user_id is set here once
    that's accepted - at that point this becomes a visibility link
    rather than a managed profile."""
    __tablename__ = "family_profiles"
    id                 = Column(Integer, primary_key=True, index=True)
    managed_by_user_id = Column(Integer, index=True)  # the account holder managing this profile
    relationship_type  = Column(String(30))  # child | parent | spouse | dependent | other
    name               = Column(String(200))
    date_of_birth      = Column(String(10))   # "YYYY-MM-DD", exact per our accounts design
    gender             = Column(String(20), nullable=True)
    phone              = Column(String(20), nullable=True)  # for SMS reminders even without a full account
    consent_confirmed  = Column(Boolean, default=False)     # required for adult managed profiles, not needed for children
    linked_user_id     = Column(Integer, nullable=True)     # set once this becomes a linked (not managed) adult account
    active             = Column(Boolean, default=True)
    created_at         = Column(DateTime, default=datetime.utcnow)

class FamilyLinkRequest(Base):
    """An invitation for an adult with their own AfyaHewa account to be
    linked (not managed) under another account holder's Family Health,
    e.g. a spouse or a parent who wants to use the app independently
    but still be visible to a family member for support."""
    __tablename__ = "family_link_requests"
    id                  = Column(Integer, primary_key=True, index=True)
    requested_by_user_id = Column(Integer, index=True)
    target_phone        = Column(String(20), nullable=True)
    target_email        = Column(String(200), nullable=True)
    relationship_type   = Column(String(30))
    status              = Column(String(20), default="pending")  # pending | accepted | declined
    created_at          = Column(DateTime, default=datetime.utcnow)
    responded_at        = Column(DateTime, nullable=True)

class MedicalRecord(Base):
    """A single medical record entry - a condition, diagnosis, prescription,
    lab result, allergy, or document note. source distinguishes records
    AfyaHewa itself generated (from a completed consultation or lab
    result) from what the patient typed in themselves, so a doctor
    viewing this later can tell what's clinically confirmed versus
    self-reported. family_profile_id is null for the account holder's
    own records, or set when this belongs to a managed family member."""
    __tablename__ = "medical_records"
    id                 = Column(Integer, primary_key=True, index=True)
    owner_user_id      = Column(Integer, index=True)  # the account holder who can see/manage this
    family_profile_id  = Column(Integer, nullable=True, index=True)  # null = the account holder's own record
    record_type        = Column(String(30))   # condition | diagnosis | prescription | lab_result | allergy | document
    title              = Column(String(200))
    description        = Column(Text, default="")
    source             = Column(String(20), default="self_reported")  # self_reported | verified_afyahewa
    date_recorded      = Column(String(20), nullable=True)  # "YYYY-MM-DD", when this happened/was noted
    created_at         = Column(DateTime, default=datetime.utcnow)

class HealthMeasurement(Base):
    """A single health measurement reading (blood pressure, glucose,
    weight, heart rate, temperature, oxygen saturation). value_secondary
    is only used for readings with two numbers (blood pressure's
    systolic/diastolic)."""
    __tablename__ = "health_measurements"
    id                 = Column(Integer, primary_key=True, index=True)
    owner_user_id      = Column(Integer, index=True)
    family_profile_id  = Column(Integer, nullable=True, index=True)
    metric_type        = Column(String(30))   # blood_pressure | blood_glucose | weight | heart_rate | temperature | spo2
    value_primary       = Column(Float)
    value_secondary      = Column(Float, nullable=True)  # diastolic, when metric_type is blood_pressure
    unit               = Column(String(20), default="")
    context            = Column(String(30), nullable=True)  # fasting | after_meal | morning | evening | random
    note               = Column(String(300), default="")
    recorded_at        = Column(DateTime, default=datetime.utcnow)

class SeasonalAlert(Base):
    """Admin-curated seasonal climate alerts (e.g. an El Nino outlook from
    Tanzania Meteorological Authority) - distinct from the automatic
    forecast-based early warnings, since seasonal patterns need real
    interpretation rather than a simple threshold check."""
    __tablename__ = "seasonal_alerts"
    id           = Column(Integer, primary_key=True, index=True)
    title_en     = Column(String(200))
    title_sw     = Column(String(200))
    message_en   = Column(Text)
    message_sw   = Column(Text)
    active       = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

class MeasurementReminder(Base):
    """A reminder to log a health measurement (BP, glucose, etc.) at
    scheduled times - same alarm/SMS-fallback pattern as MedicineReminder,
    just for measurements instead of medicine doses."""
    __tablename__ = "measurement_reminders"
    id                  = Column(Integer, primary_key=True, index=True)
    reminder_id         = Column(String(20), unique=True, index=True)
    patient_phone       = Column(String(20), index=True)
    family_profile_id   = Column(Integer, nullable=True, index=True)
    on_behalf_of_name   = Column(String(200), nullable=True)
    metric_type         = Column(String(30))   # blood_pressure | blood_glucose | weight | heart_rate | temperature | spo2
    times               = Column(String(200))  # "08:00,20:00"
    start_date          = Column(String(20))
    end_date            = Column(String(20), nullable=True)
    active              = Column(Boolean, default=True)
    sms_fallback        = Column(Boolean, default=True)
    language            = Column(String(5), default="en")
    created_at          = Column(DateTime, default=datetime.utcnow)

class MeasurementReminderLog(Base):
    """Same dedupe-guard pattern as ReminderLog, for measurement reminders."""
    __tablename__ = "measurement_reminder_logs"
    id             = Column(Integer, primary_key=True, index=True)
    reminder_id    = Column(String(20), index=True)
    date           = Column(String(20))
    scheduled_time = Column(String(10))
    sent_at        = Column(DateTime, default=datetime.utcnow)

class Vendor(Base):
    """A partner pharmacy/supplier in the Health Shop marketplace.
    Payout details (mobile money number + provider) are used when
    admin triggers a payout via AzamPay's disbursement API."""
    __tablename__ = "vendors"
    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String(200))
    phone               = Column(String(20))
    payout_provider     = Column(String(30), default="")  # Mpesa | Tigo | Airtel | Halopesa | Azampesa
    payout_account      = Column(String(30), default="")  # mobile money number to pay out to
    verified            = Column(Boolean, default=False)
    active              = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    """A single product listed by a vendor. Prescription medicines are
    deliberately excluded from the categories offered until pharmacy
    licensing is sorted - see the proposal's discussion of this."""
    __tablename__ = "products"
    id           = Column(Integer, primary_key=True, index=True)
    vendor_id    = Column(Integer, index=True)
    name         = Column(String(200))
    category     = Column(String(50))  # medical_equipment | first_aid | maternal_baby | reproductive_health | personal_hygiene | diabetes_supplies | water_purification | mosquito_protection | heat_protection
    description  = Column(Text, default="")
    price        = Column(Float)       # TZS
    stock        = Column(Integer, default=0)
    image_url    = Column(String(500), nullable=True)
    active       = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

class ShopOrder(Base):
    """One checkout, as the customer experiences it - one payment,
    possibly split across several vendors behind the scenes via SubOrder."""
    __tablename__ = "shop_orders"
    id              = Column(Integer, primary_key=True, index=True)
    order_id        = Column(String(20), unique=True, index=True)
    owner_user_id   = Column(Integer, index=True)
    total_amount    = Column(Float)
    payment_status  = Column(String(20), default="pending")  # pending | paid | failed
    azampay_ref     = Column(String(100), nullable=True)  # AzamPay's externalId/transaction reference
    delivery_name   = Column(String(200))
    delivery_phone  = Column(String(20))
    delivery_address = Column(String(300))
    created_at      = Column(DateTime, default=datetime.utcnow)

class SubOrder(Base):
    """One vendor's slice of a ShopOrder - what that vendor actually
    sees and fulfills. items is a JSON string list of {product_id, name, price, qty}."""
    __tablename__ = "sub_orders"
    id           = Column(Integer, primary_key=True, index=True)
    order_id     = Column(String(20), index=True)
    vendor_id    = Column(Integer, index=True)
    items        = Column(Text)  # JSON list
    subtotal     = Column(Float)
    status       = Column(String(20), default="pending")  # pending | processing | shipped | delivered
    created_at   = Column(DateTime, default=datetime.utcnow)

class VendorPayout(Base):
    """A record of an admin-triggered payout to a vendor via AzamPay's
    disbursement API - covers one or more completed sub-orders."""
    __tablename__ = "vendor_payouts"
    id             = Column(Integer, primary_key=True, index=True)
    vendor_id      = Column(Integer, index=True)
    amount         = Column(Float)
    commission     = Column(Float)  # what AfyaHewa kept
    azampay_ref    = Column(String(100), nullable=True)
    status         = Column(String(20), default="pending")  # pending | sent | failed
    created_at     = Column(DateTime, default=datetime.utcnow)

class MenstrualPeriod(Base):
    """A logged period start (and optionally end) date. Cycle length and
    predictions are calculated from the history of these entries, not
    stored directly - so predictions improve automatically as more
    periods are logged."""
    __tablename__ = "menstrual_periods"
    id                 = Column(Integer, primary_key=True, index=True)
    owner_user_id      = Column(Integer, index=True)
    family_profile_id  = Column(Integer, nullable=True, index=True)
    start_date         = Column(String(20))  # "YYYY-MM-DD"
    end_date           = Column(String(20), nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)

class MenstrualLog(Base):
    """An optional daily symptom entry - flow intensity, cramps, mood -
    logged independently of period start/end dates."""
    __tablename__ = "menstrual_logs"
    id                 = Column(Integer, primary_key=True, index=True)
    owner_user_id      = Column(Integer, index=True)
    family_profile_id  = Column(Integer, nullable=True, index=True)
    date               = Column(String(20))
    flow               = Column(String(20), nullable=True)   # light | medium | heavy | spotting
    cramps             = Column(String(20), nullable=True)   # none | mild | moderate | severe
    mood               = Column(String(20), nullable=True)   # good | irritable | low | anxious
    notes              = Column(String(300), default="")
    created_at         = Column(DateTime, default=datetime.utcnow)

class Lab(Base):
    """A partner laboratory offering diagnostic tests. Placeholder
    entries until real partner labs are onboarded - same caution as
    the placeholder doctors."""
    __tablename__ = "labs"
    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(200))
    address      = Column(String(300), default="")
    phone        = Column(String(20), default="")
    district     = Column(String(100), default="")
    active       = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

class LabTest(Base):
    """A specific test a lab offers, and its price."""
    __tablename__ = "lab_tests"
    id           = Column(Integer, primary_key=True, index=True)
    lab_id       = Column(Integer, index=True)
    name         = Column(String(200))     # e.g. "Full Blood Count", "HIV Test"
    category     = Column(String(50))      # blood | diabetes | hiv_sti | pregnancy | cholesterol | kidney_liver | other
    price        = Column(Float, default=0)
    sensitive    = Column(Boolean, default=False)  # true for HIV/STI - triggers the informed-consent step and post-result support prompt
    active       = Column(Boolean, default=True)

class LabBooking(Base):
    """A patient's booked test. Results are entered by an admin/lab staff
    for now (result_text/result_summary) - real lab system integration
    is a future step."""
    __tablename__ = "lab_bookings"
    id                = Column(Integer, primary_key=True, index=True)
    booking_id        = Column(String(20), unique=True, index=True)
    owner_user_id     = Column(Integer, index=True)
    family_profile_id = Column(Integer, nullable=True)
    lab_id            = Column(Integer, index=True)
    test_id           = Column(Integer, index=True)
    patient_name      = Column(String(200))
    patient_phone     = Column(String(20))
    scheduled_date    = Column(String(20))  # "YYYY-MM-DD"
    status            = Column(String(20), default="booked")  # booked | sample_collected | results_ready | cancelled
    result_summary    = Column(Text, nullable=True)
    result_ready_at   = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)

class EmergencyContact(Base):
    """A personal contact who gets an automatic SMS with the user's
    location when they trigger an emergency alert. Distinct from the
    static 112/emergency-services numbers - these are real people."""
    __tablename__ = "emergency_contacts"
    id             = Column(Integer, primary_key=True, index=True)
    owner_user_id  = Column(Integer, index=True)
    name           = Column(String(200))
    phone          = Column(String(20))
    relationship_type = Column(String(30), default="other")
    created_at     = Column(DateTime, default=datetime.utcnow)

class EmergencyAlert(Base):
    """A record of each time a user actually triggered an emergency alert -
    kept so the user (and the person who triggered it) can see it happened,
    and to prevent abuse/spam of the same alert firing repeatedly."""
    __tablename__ = "emergency_alerts"
    id             = Column(Integer, primary_key=True, index=True)
    owner_user_id  = Column(Integer, index=True)
    latitude       = Column(Float, nullable=True)
    longitude      = Column(Float, nullable=True)
    contacts_notified = Column(Integer, default=0)
    created_at     = Column(DateTime, default=datetime.utcnow)

class Admin(Base):
    """A real admin account - bootstrapped once via a secret-protected
    setup endpoint, then logs in normally. Every admin-only action across
    the platform should require this, not be left open."""
    __tablename__ = "admins"
    id             = Column(Integer, primary_key=True, index=True)
    login_username = Column(String(100), unique=True, index=True)
    password_hash  = Column(String(200))
    name           = Column(String(200), default="Admin")
    active         = Column(Boolean, default=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

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
    health, palliative care, mental health/psychology). Doctors don't
    self-register - admin creates their login (login_username/password_hash).
    prices is a JSON string keyed by consultation type, e.g.
    '{"chat": 5000, "voice": 8000, "video": 12000}' (TZS)."""
    __tablename__ = "doctors"
    id                  = Column(Integer, primary_key=True, index=True)
    name                = Column(String(200))
    specialty           = Column(String(50), index=True)   # general | reproductive_health | palliative_care | mental_health
    bio                 = Column(Text, default="")
    phone               = Column(String(20))
    photo_url           = Column(String(500), nullable=True)
    prices              = Column(Text, default="{}")  # JSON string: {"chat": 5000, "voice": 8000, "video": 12000}
    consultation_types  = Column(String(100), default="chat")  # comma list: chat,voice,video
    available_days      = Column(String(100), default="Mon,Tue,Wed,Thu,Fri")
    available_hours     = Column(String(50), default="09:00-17:00")
    login_username      = Column(String(100), unique=True, nullable=True)
    password_hash       = Column(String(200), nullable=True)
    active              = Column(Boolean, default=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

class DoctorChangeRequest(Base):
    """A doctor's proposed change to their own price or availability -
    sits pending until admin approves it, so nothing changes live
    without oversight."""
    __tablename__ = "doctor_change_requests"
    id             = Column(Integer, primary_key=True, index=True)
    doctor_id      = Column(Integer, index=True)
    field          = Column(String(30))   # prices | available_days | available_hours
    proposed_value = Column(Text)
    status         = Column(String(20), default="pending")  # pending | approved | rejected
    created_at     = Column(DateTime, default=datetime.utcnow)
    responded_at   = Column(DateTime, nullable=True)

class ChatMessage(Base):
    """A single message in a patient-doctor conversation, tied to a
    specific appointment. Real-time delivery happens over WebSocket;
    every message is also persisted here so nothing is lost if either
    side is offline, and the recipient gets an SMS fallback notification
    when they're not currently connected."""
    __tablename__ = "chat_messages"
    id             = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(String(20), index=True)
    sender_type    = Column(String(10))  # patient | doctor
    text           = Column(Text)
    created_at     = Column(DateTime, default=datetime.utcnow)

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
    alarm-style notification) when a scheduled time is reached.
    family_profile_id is optional - set when an account holder creates
    this reminder on behalf of a managed family member rather than for
    themselves; patient_phone still determines who actually receives
    the SMS (the family member's own phone if they have one, otherwise
    falls back to whoever's phone was provided)."""
    __tablename__ = "medicine_reminders"
    id                  = Column(Integer, primary_key=True, index=True)
    reminder_id         = Column(String(20), unique=True, index=True)
    patient_phone       = Column(String(20), index=True)
    family_profile_id   = Column(Integer, nullable=True, index=True)
    on_behalf_of_name   = Column(String(200), nullable=True)  # display name if set on behalf of a family member
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

# create_all() only creates tables that don't exist yet - it never adds new
# columns to a table that's already there. Any column added to a table that
# already existed in production needs to be listed here explicitly, or the
# app will crash with "column does not exist" the moment it's queried.
_COLUMNS_ADDED_TO_EXISTING_TABLES = [
    ("medicine_reminders", "family_profile_id", "INTEGER"),
    ("medicine_reminders", "on_behalf_of_name", "VARCHAR(200)"),
    ("doctors", "photo_url", "VARCHAR(500)"),
    ("doctors", "prices", "TEXT DEFAULT '{}'"),
    ("doctors", "login_username", "VARCHAR(100)"),
    ("doctors", "password_hash", "VARCHAR(200)"),
]

def _run_lightweight_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        for table, column, coltype in _COLUMNS_ADDED_TO_EXISTING_TABLES:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {coltype}"))
                conn.commit()
            except Exception as e:
                print(f"[migration] Could not add {table}.{column}: {e}")
        # doctors.login_username needs a unique index, added separately since
        # "ADD COLUMN IF NOT EXISTS" above can't also declare UNIQUE cleanly
        try:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_doctors_login_username ON doctors (login_username)"))
            conn.commit()
        except Exception as e:
            print(f"[migration] Could not add unique index on doctors.login_username: {e}")

def init_db():
    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()

# ── Dependency for routes ─────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
