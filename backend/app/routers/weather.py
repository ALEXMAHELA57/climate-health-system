from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import httpx
from database import get_db, SeasonalAlert

router = APIRouter()

DISTRICTS = {
    "Iringa": {"lat": -7.77, "lon": 35.69},
    "Dar es Salaam": {"lat": -6.7924, "lon": 39.2083},
    "Dodoma": {"lat": -6.1722, "lon": 35.7395},
    "Mwanza": {"lat": -2.5164, "lon": 32.9175},
    "Arusha": {"lat": -3.3869, "lon": 36.683},
    "Mbeya": {"lat": -8.9094, "lon": 33.4607},
    "Morogoro": {"lat": -6.8218, "lon": 37.6619},
    "Tanga": {"lat": -5.0688, "lon": 39.0987},
    "Zanzibar": {"lat": -6.1659, "lon": 39.2026},
    "Moshi": {"lat": -3.35, "lon": 37.3333},
    "Tabora": {"lat": -5.0167, "lon": 32.8},
    "Kigoma": {"lat": -4.8833, "lon": 29.6333},
    "Lindi": {"lat": -9.9989, "lon": 39.7144},
    "Mtwara": {"lat": -10.2667, "lon": 40.1833},
    "Songea": {"lat": -10.6833, "lon": 35.65},
    "Shinyanga": {"lat": -3.6636, "lon": 33.423},
    "Singida": {"lat": -4.8189, "lon": 34.7484},
    "Rukwa": {"lat": -7.9833, "lon": 32.0333},
}

@router.get("/districts")
async def list_districts():
    return {"districts": list(DISTRICTS.keys())}

@router.get("/{district}")
async def get_weather(district: str):
    coords = DISTRICTS.get(district)
    if not coords:
        return {"error": "District not found"}
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={coords['lat']}&longitude={coords['lon']}"
        f"&current=temperature_2m,apparent_temperature,relative_humidity_2m,"
        f"wind_speed_10m,weather_code,precipitation"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code"
        f"&timezone=Africa/Dar_es_Salaam&forecast_days=7"
    )
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        return r.json()

# ── Air Quality (Open-Meteo's separate air-quality API, same coordinates) ────

AQI_LABELS = [
    (50, "good", "Nzuri"),
    (100, "moderate", "Wastani"),
    (150, "unhealthy_sensitive", "Si Nzuri kwa Wenye Hisia"),
    (200, "unhealthy", "Si Nzuri"),
    (99999, "very_unhealthy", "Hatari"),
]

@router.get("/{district}/air-quality")
async def get_air_quality(district: str):
    coords = DISTRICTS.get(district)
    if not coords:
        return {"error": "District not found"}
    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={coords['lat']}&longitude={coords['lon']}"
        f"&current=pm2_5,pm10,ozone,carbon_monoxide,nitrogen_dioxide,us_aqi"
        f"&timezone=Africa/Dar_es_Salaam"
    )
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        data = r.json()
    current = data.get("current", {})
    aqi = current.get("us_aqi")
    label, label_sw = "unknown", "Haijulikani"
    if aqi is not None:
        for threshold, en, sw in AQI_LABELS:
            if aqi <= threshold:
                label, label_sw = en, sw
                break
    return {"current": current, "aqi": aqi, "label": label, "label_sw": label_sw}

# ── Early Warning: Tier 1 - forecast-based, days ahead ────────────────────

@router.get("/{district}/early-warning")
async def get_early_warning(district: str):
    coords = DISTRICTS.get(district)
    if not coords:
        return {"error": "District not found"}
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={coords['lat']}&longitude={coords['lon']}"
        f"&daily=precipitation_sum,temperature_2m_max,weather_code"
        f"&timezone=Africa/Dar_es_Salaam&forecast_days=7"
    )
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        data = r.json()
    daily = data.get("daily", {})
    dates = daily.get("time", [])
    rain = daily.get("precipitation_sum", [])
    temps = daily.get("temperature_2m_max", [])

    warnings = []
    for i in range(1, len(dates)):  # skip today (index 0) - this is about what's coming, not current conditions
        if i < len(rain) and rain[i] and rain[i] > 25:
            warnings.append({
                "days_ahead": i, "date": dates[i], "type": "heavy_rain",
                "message_en": f"Heavy rain forecast in {i} day(s) - malaria and flood risk may rise. Prepare now.",
                "message_sw": f"Mvua nzito inatarajiwa baada ya siku {i} - hatari ya malaria na mafuriko yaweza kuongezeka.",
            })
        if i < len(temps) and temps[i] and temps[i] > 36:
            warnings.append({
                "days_ahead": i, "date": dates[i], "type": "extreme_heat",
                "message_en": f"Extreme heat forecast in {i} day(s) ({temps[i]:.0f}°C). Plan for hydration and shade.",
                "message_sw": f"Joto kali linatarajiwa baada ya siku {i} ({temps[i]:.0f}°C).",
            })
    return {"warnings": warnings}

# ── Early Warning: Tier 2 - seasonal, admin-curated (e.g. El Nino outlooks) ──

class SeasonalAlertIn(BaseModel):
    title_en: str
    title_sw: str
    message_en: str
    message_sw: str

@router.get("/seasonal-alerts/active")
def get_active_seasonal_alerts(db: Session = Depends(get_db)):
    alerts = db.query(SeasonalAlert).filter(SeasonalAlert.active == True).order_by(SeasonalAlert.created_at.desc()).all()
    return {"alerts": [{
        "id": a.id, "title_en": a.title_en, "title_sw": a.title_sw,
        "message_en": a.message_en, "message_sw": a.message_sw, "created_at": a.created_at.isoformat(),
    } for a in alerts]}

@router.post("/seasonal-alerts")
def create_seasonal_alert(data: SeasonalAlertIn, db: Session = Depends(get_db)):
    # NOTE: admin-only in intent (matches TMA seasonal outlook announcements) -
    # not yet gated behind an admin-auth check; add one before this is exposed publicly.
    alert = SeasonalAlert(title_en=data.title_en, title_sw=data.title_sw, message_en=data.message_en, message_sw=data.message_sw, active=True)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"success": True, "alert_id": alert.id}

@router.delete("/seasonal-alerts/{alert_id}")
def deactivate_seasonal_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(SeasonalAlert).filter(SeasonalAlert.id == alert_id).first()
    if not alert:
        return {"success": False, "error": "Alert not found"}
    alert.active = False
    db.commit()
    return {"success": True}