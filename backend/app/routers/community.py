from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json, os, uuid

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
        json.dump(reports[-500:], f)

class ReportIn(BaseModel):
    type: str
    region: Optional[str] = ""
    district: Optional[str] = ""
    street: Optional[str] = ""
    details: Optional[str] = ""
    severity: Optional[str] = "medium"
    language: Optional[str] = "en"
    timestamp: Optional[str] = None

class StatusUpdate(BaseModel):
    report_id: str
    status: str  # under_review | accepted | declined | retracted
    admin_note: Optional[str] = ""

@router.post("/report")
async def submit_report(report: ReportIn):
    reports = load_reports()
    report_id = str(uuid.uuid4())[:8]  # short unique ID
    entry = {
        "id": report_id,
        "type": report.type,
        "region": report.region,
        "district": report.district,
        "street": report.street,
        "details": report.details,
        "severity": report.severity,
        "language": report.language,
        "timestamp": report.timestamp or datetime.utcnow().isoformat(),
        "status": "under_review",
        "admin_note": "",
        "updated_at": datetime.utcnow().isoformat()
    }
    reports.append(entry)
    save_reports(reports)
    return {"success": True, "report_id": report_id, "status": "under_review"}

@router.get("/status/{report_id}")
async def get_status(report_id: str):
    reports = load_reports()
    report = next((r for r in reports if r.get("id") == report_id), None)
    if not report:
        return {"found": False}
    return {
        "found": True,
        "report_id": report_id,
        "status": report.get("status", "under_review"),
        "admin_note": report.get("admin_note", ""),
        "type": report.get("type"),
        "district": report.get("district"),
        "timestamp": report.get("timestamp"),
        "updated_at": report.get("updated_at")
    }

@router.post("/update-status")
async def update_status(update: StatusUpdate):
    reports = load_reports()
    for r in reports:
        if r.get("id") == update.report_id:
            r["status"] = update.status
            r["admin_note"] = update.admin_note
            r["updated_at"] = datetime.utcnow().isoformat()
            save_reports(reports)
            return {"success": True}
    return {"success": False, "error": "Report not found"}

@router.get("/reports")
async def get_reports(limit: int = 20, district: Optional[str] = None):
    reports = load_reports()
    if district and district != "ALL":
        reports = [r for r in reports if r.get("district") == district]
    reports.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    return {"reports": reports[:limit], "total": len(reports)}
