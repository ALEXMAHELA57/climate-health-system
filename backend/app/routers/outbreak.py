from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timedelta
import json, os

router = APIRouter()

# Simple file-based storage (no database needed)
DATA_FILE = "outbreak_data.json"

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

class SymptomReport(BaseModel):
    district: str
    symptoms: list[str]
    lang: str = "en"

@router.post("/report")
async def report_symptoms(report: SymptomReport):
    """Anonymously save symptom report for outbreak detection"""
    data = load_data()
    entry = {
        "district": report.district,
        "symptoms": report.symptoms,
        "date": datetime.now().isoformat(),
        "week": datetime.now().strftime("%Y-W%W"),
    }
    data.append(entry)
    # Keep only last 90 days of data
    cutoff = (datetime.now() - timedelta(days=90)).isoformat()
    data = [d for d in data if d["date"] > cutoff]
    save_data(data)
    return {"status": "recorded"}

@router.get("/summary")
async def get_outbreak_summary():
    """Get symptom counts per district for last 7 days"""
    data = load_data()
    cutoff = (datetime.now() - timedelta(days=7)).isoformat()
    recent = [d for d in data if d["date"] > cutoff]

    # Count symptoms per district
    summary = {}
    for entry in recent:
        district = entry["district"]
        if district not in summary:
            summary[district] = {
                "total_reports": 0,
                "symptoms": {},
                "district": district,
            }
        summary[district]["total_reports"] += 1
        for symptom in entry["symptoms"]:
            s = symptom.lower()
            summary[district]["symptoms"][s] = summary[district]["symptoms"].get(s, 0) + 1

    # Calculate outbreak risk per district
    results = []
    for district, data in summary.items():
        total = data["total_reports"]
        symptoms = data["symptoms"]

        # Determine outbreak risk
        risk = "low"
        alerts = []

        # Fever threshold
        fever_count = symptoms.get("fever", 0) + symptoms.get("homa", 0)
        if fever_count >= 10:
            risk = "emergency"
            alerts.append(f"High fever reports: {fever_count} cases")
        elif fever_count >= 5:
            risk = "high"
            alerts.append(f"Elevated fever reports: {fever_count} cases")

        # Diarrhoea/cholera threshold
        diarrhea_count = symptoms.get("diarrhoea", 0) + symptoms.get("kuharisha", 0)
        if diarrhea_count >= 5:
            risk = "high" if risk == "low" else risk
            alerts.append(f"Diarrhoea reports: {diarrhea_count} cases — possible cholera")

        # General high reports
        if total >= 20:
            risk = "high" if risk == "low" else risk
            alerts.append(f"Unusual symptom activity: {total} reports this week")
        elif total >= 10:
            risk = "medium" if risk == "low" else risk
            alerts.append(f"Increased symptom reports: {total} this week")

        results.append({
            "district": district,
            "total_reports": total,
            "top_symptoms": sorted(symptoms.items(), key=lambda x: x[1], reverse=True)[:5],
            "risk": risk,
            "alerts": alerts,
        })

    # Sort by risk level
    risk_order = {"emergency": 0, "high": 1, "medium": 2, "low": 3}
    results.sort(key=lambda x: risk_order.get(x["risk"], 4))

    return {"summary": results, "total_reports": len(recent)}

@router.get("/district/{district}")
async def get_district_outbreak(district: str):
    """Get detailed outbreak data for a specific district"""
    data = load_data()
    cutoff = (datetime.now() - timedelta(days=30)).isoformat()
    district_data = [d for d in data if d["district"] == district and d["date"] > cutoff]

    # Group by week
    weekly = {}
    for entry in district_data:
        week = entry["week"]
        if week not in weekly:
            weekly[week] = {"count": 0, "symptoms": {}}
        weekly[week]["count"] += 1
        for s in entry["symptoms"]:
            sl = s.lower()
            weekly[week]["symptoms"][sl] = weekly[week]["symptoms"].get(sl, 0) + 1

    return {
        "district": district,
        "last_30_days": len(district_data),
        "weekly_trend": weekly,
    }
