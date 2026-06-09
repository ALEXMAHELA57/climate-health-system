from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, Subscriber, CommunityReport, SymptomReport
from datetime import datetime, timedelta
from collections import Counter

router = APIRouter()

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_subscribers = db.query(Subscriber).filter(Subscriber.active == True).count()
    reports_today = db.query(CommunityReport).filter(CommunityReport.timestamp >= today_start).count()
    symptom_checks_week = db.query(SymptomReport).filter(SymptomReport.timestamp >= week_ago).count()
    active_outbreaks = 0

    # Top regions by report count this week
    week_reports = db.query(CommunityReport).filter(CommunityReport.timestamp >= week_ago).all()
    region_counts = Counter(r.region for r in week_reports if r.region)
    top_regions = [{"district": region, "reports": count} for region, count in region_counts.most_common(5)]

    # Outbreak detection — regions with 5+ symptom reports this week
    week_symptoms = db.query(SymptomReport).filter(SymptomReport.timestamp >= week_ago).all()
    symptom_by_region = Counter(s.region for s in week_symptoms if s.region)
    active_outbreaks = sum(1 for count in symptom_by_region.values() if count >= 5)

    # Recent subscribers
    subscribers = db.query(Subscriber).filter(Subscriber.active == True)\
        .order_by(Subscriber.subscribed_at.desc()).limit(50).all()

    return {
        "total_subscribers": total_subscribers,
        "reports_today": reports_today,
        "symptom_checks_week": symptom_checks_week,
        "active_outbreaks": active_outbreaks,
        "top_districts": top_regions,
        "subscribers": [
            {
                "phone": s.phone,
                "region": s.region,
                "language": s.language,
                "subscribed_at": s.subscribed_at.isoformat()
            } for s in subscribers
        ]
    }
