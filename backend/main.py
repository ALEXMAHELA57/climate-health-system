from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import weather, clinics, symptoms, outbreak, community, admin, sms, consultation, medicine, auth, family, my_health, emergency_contacts, lab
from database import init_db
from scheduler import create_scheduler

app = FastAPI(title="Climate Health API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = create_scheduler()

@app.on_event("startup")
async def startup():
    init_db()           # Create all DB tables
    scheduler.start()   # Start automatic SMS alert scheduler
    print("AfyaHewa backend started. Scheduler running.")

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

app.include_router(weather.router,   prefix="/api/weather",   tags=["Weather"])
app.include_router(clinics.router,   prefix="/api/clinics",   tags=["Clinics"])
app.include_router(symptoms.router,  prefix="/api/symptoms",  tags=["Symptoms"])
app.include_router(outbreak.router,  prefix="/api/outbreak",  tags=["Outbreak"])
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["Admin"])
app.include_router(sms.router,       prefix="/api/sms",       tags=["SMS"])
app.include_router(consultation.router, prefix="/api/consultation", tags=["Consultation"])
app.include_router(medicine.router,  prefix="/api/medicine",  tags=["Medicine Reminders"])
app.include_router(auth.router,      prefix="/api/auth",      tags=["Authentication"])
app.include_router(family.router,    prefix="/api/family",    tags=["Family Health"])
app.include_router(my_health.router, prefix="/api/my-health", tags=["My Health"])
app.include_router(emergency_contacts.router, prefix="/api/emergency-contacts", tags=["Emergency Contacts"])
app.include_router(lab.router,        prefix="/api/lab",        tags=["Lab & Diagnostics"])

@app.get("/")
def root():
    return {"message": "AfyaHewa API is running", "status": "ok"}
