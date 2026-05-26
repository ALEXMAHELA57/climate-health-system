from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import weather, clinics, symptoms

app = FastAPI(title="Climate Health API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(clinics.router, prefix="/api/clinics", tags=["Clinics"])
app.include_router(symptoms.router, prefix="/api/symptoms", tags=["Symptoms"])

@app.get("/")
def root():
    return {"message": "Climate Health API is running", "status": "ok"}