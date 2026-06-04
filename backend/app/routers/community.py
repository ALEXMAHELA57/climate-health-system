from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json, os

router = APIRouter()

REPORTS_FILE = "community_reports.json"

def load_reports():
    if os.path.exists(REPORTS_FILE):
        try:
            with open(REPORTS_FILE) as f:
                return json.load(f)
        except:
            return []
    return []

def save_reports(reports):
    with open(REPORTS_FILE, "w") as f:
        json.dump(reports[-500:], f)  # keep last 500

class ReportIn(BaseModel):
    type: str
    district: str
    details: Optional[str] = ""
    severity: Optional[str] = "medium"
    language: Optional[str] = "en"
    timestamp: Optional[str] = None

@router.post("/report")
async def submit_report(report: ReportIn):
    reports = load_reports()
    entry = {
        "type": report.type,
        "district": report.district,
        "details": report.details,
        "severity": report.severity,
        "language": report.language,
        "timestamp": report.timestamp or datetime.utcnow().isoformat()
    }
    reports.append(entry)
    save_reports(reports)
    return {"success": True, "message": "Report submitted"}

@router.get("/reports")
async def get_reports(limit: int = 20, district: Optional[str] = None):
    reports = load_reports()
    if district and district != "ALL":
        reports = [r for r in reports if r.get("district") == district]
    reports.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    return {"reports": reports[:limit], "total": len(reports)}
