from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import weather, clinics, symptoms, outbreak, community, admin, sms
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

@app.get("/")
def root():
    return {"message": "AfyaHewa API is running", "status": "ok"}
