from fastapi import APIRouter
import httpx

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