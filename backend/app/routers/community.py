from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db, CommunityReport
import uuid

router = APIRouter()

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
    status: str
    admin_note: Optional[str] = ""
    details: Optional[str] = None

@router.post("/report")
async def submit_report(report: ReportIn, db: Session = Depends(get_db)):
    report_id = str(uuid.uuid4())[:8]
    entry = CommunityReport(
        report_id   = report_id,
        type        = report.type,
        region      = report.region,
        district    = report.district,
        street      = report.street,
        details     = report.details,
        severity    = report.severity,
        language    = report.language,
        status      = "under_review",
        timestamp   = datetime.fromisoformat(report.timestamp) if report.timestamp else datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"success": True, "report_id": report_id, "status": "under_review"}

@router.get("/status/{report_id}")
async def get_status(report_id: str, db: Session = Depends(get_db)):
    report = db.query(CommunityReport).filter(CommunityReport.report_id == report_id).first()
    if not report:
        return {"found": False}
    return {
        "found": True,
        "report_id": report_id,
        "status": report.status,
        "admin_note": report.admin_note,
        "type": report.type,
        "region": report.region,
        "district": report.district,
        "street": report.street,
        "timestamp": report.timestamp.isoformat(),
        "updated_at": report.updated_at.isoformat() if report.updated_at else None
    }

@router.post("/update-status")
async def update_status(update: StatusUpdate, db: Session = Depends(get_db)):
    report = db.query(CommunityReport).filter(CommunityReport.report_id == update.report_id).first()
    if not report:
        return {"success": False, "error": "Report not found"}
    report.status = update.status
    report.admin_note = update.admin_note
    if update.details is not None:
        report.details = update.details
    report.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}

@router.get("/reports")
async def get_reports(limit: int = 20, region: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(CommunityReport)
    if region and region != "ALL":
        query = query.filter(CommunityReport.region == region)
    reports = query.order_by(CommunityReport.timestamp.desc()).limit(limit).all()
    return {
        "reports": [
            {
                "id": r.id,
                "report_id": r.report_id,
                "type": r.type,
                "region": r.region,
                "district": r.district,
                "street": r.street,
                "details": r.details,
                "severity": r.severity,
                "status": r.status,
                "admin_note": r.admin_note,
                "timestamp": r.timestamp.isoformat(),
                "updated_at": r.updated_at.isoformat() if r.updated_at else None
            } for r in reports
        ],
        "total": db.query(CommunityReport).count()
    }
