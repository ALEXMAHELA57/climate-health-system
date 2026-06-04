from fastapi import APIRouter
import json, os
from datetime import datetime, timedelta
from collections import Counter

router = APIRouter()

def load_json(path, default):
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except:
            return default
    return default

@router.get("/stats")
async def get_stats():
    subscribers = load_json("subscribers.json", [])
    reports = load_json("community_reports.json", [])
    symptoms = load_json("symptom_reports.json", [])

    now = datetime.utcnow()
    today = now.date().isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()

    reports_today = [r for r in reports if r.get("timestamp", "")[:10] == today]
    symptoms_week = [s for s in symptoms if s.get("timestamp", "") >= week_ago]

    district_counts = Counter(r.get("district") for r in reports if r.get("timestamp", "") >= week_ago)
    top_districts = [{"district": d, "reports": c} for d, c in district_counts.most_common(5)]

    # Simple outbreak detection
    symptom_by_district = {}
    for s in symptoms_week:
        d = s.get("district", "Unknown")
        if d not in symptom_by_district:
            symptom_by_district[d] = []
        symptom_by_district[d].extend(s.get("symptoms", []))

    active_outbreaks = sum(1 for v in symptom_by_district.values() if len(v) >= 5)

    return {
        "total_subscribers": len(subscribers),
        "reports_today": len(reports_today),
        "symptom_checks_week": len(symptoms_week),
        "active_outbreaks": active_outbreaks,
        "top_districts": top_districts,
        "subscribers": subscribers[-50:]  # last 50 for display
    }
