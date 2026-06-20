from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import get_db, SymptomReport, OutbreakAlert, SystemSetting
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

# ── Outbreak detection rules ──────────────────────────────────────────────────
DISEASE_PATTERNS = [
    {
        'name': 'Malaria', 'name_sw': 'Malaria',
        'keywords': ['fever', 'chills', 'headache', 'homa', 'baridi', 'maumivu ya kichwa'],
        'min_keywords': 2, 'threshold_3day': 5, 'threshold_7day': 10,
        'color': '#f59e0b', 'icon': '🦟',
    },
    {
        'name': 'Cholera', 'name_sw': 'Kipindupindu',
        'keywords': ['diarrhoea', 'vomiting', 'kuharisha', 'kutapika', 'diarrhea'],
        'min_keywords': 1, 'threshold_3day': 5, 'threshold_7day': 8,
        'color': '#0e7490', 'icon': '💧',
    },
    {
        'name': 'Dengue', 'name_sw': 'Dengue',
        'keywords': ['rash', 'joint pain', 'fever', 'upele', 'maumivu ya viungo', 'homa'],
        'min_keywords': 2, 'threshold_3day': 3, 'threshold_7day': 6,
        'color': '#dc2626', 'icon': '🦟',
    },
    {
        'name': 'Respiratory Infection', 'name_sw': 'Maambukizi ya Njia ya Hewa',
        'keywords': ['cough', 'breathing', 'throat', 'kikohozi', 'kupumua', 'koo'],
        'min_keywords': 1, 'threshold_3day': 8, 'threshold_7day': 15,
        'color': '#7c3aed', 'icon': '🫁',
    },
    {
        'name': 'Typhoid', 'name_sw': 'Homa ya Matumbo',
        'keywords': ['fever', 'stomach', 'abdomen', 'homa', 'tumbo', 'weak'],
        'min_keywords': 2, 'threshold_3day': 5, 'threshold_7day': 10,
        'color': '#92400e', 'icon': '🤒',
    },
]

SETTING_KEY = "auto_publish_outbreaks"


def symptom_matches_pattern(symptom_text: str, keywords: list) -> int:
    text = symptom_text.lower()
    return sum(1 for kw in keywords if kw.lower() in text)


def analyze_region(reports: list, pattern: dict) -> dict:
    now = datetime.utcnow()
    three_days_ago = now - timedelta(days=3)
    seven_days_ago = now - timedelta(days=7)

    matching_3day = 0
    matching_7day = 0
    for r in reports:
        matches = symptom_matches_pattern(r.symptoms or '', pattern['keywords'])
        if matches >= pattern['min_keywords']:
            if r.timestamp >= three_days_ago:
                matching_3day += 1
            if r.timestamp >= seven_days_ago:
                matching_7day += 1

    risk = 'none'
    confidence = 0.0
    if matching_3day >= pattern['threshold_3day']:
        risk = 'emergency'
        confidence = min(1.0, matching_3day / (pattern['threshold_3day'] * 1.5))
    elif matching_7day >= pattern['threshold_7day']:
        risk = 'high'
        confidence = min(1.0, matching_7day / (pattern['threshold_7day'] * 1.5))
    elif matching_3day >= pattern['threshold_3day'] // 2:
        risk = 'medium'
        confidence = min(0.7, matching_3day / pattern['threshold_3day'])
    elif matching_7day >= pattern['threshold_7day'] // 3:
        risk = 'low'
        confidence = min(0.4, matching_7day / pattern['threshold_7day'])

    return {
        'disease': pattern['name'], 'disease_sw': pattern['name_sw'],
        'icon': pattern['icon'], 'color': pattern['color'],
        'risk': risk, 'confidence': round(confidence, 2),
        'reports_3day': matching_3day, 'reports_7day': matching_7day,
    }


def get_top_symptoms(reports: list) -> list:
    all_words = []
    skip = {'i', 'have', 'a', 'and', 'the', 'with', 'for', 'my', 'of',
            'is', 'in', 'na', 'ya', 'wa', 'ni', 'kwa', 'la', 'au'}
    for r in reports:
        words = (r.symptoms or '').lower().split(',')
        for w in words:
            w = w.strip()
            if w and w not in skip and len(w) > 2:
                all_words.append(w)
    counter = Counter(all_words)
    return [word for word, _ in counter.most_common(5)]


def is_auto_publish_enabled(db: Session) -> bool:
    setting = db.query(SystemSetting).filter(SystemSetting.key == SETTING_KEY).first()
    return setting.value == "true" if setting else False  # default: requires approval


def detect_all_outbreaks(db: Session) -> list:
    """Run live detection against symptom reports, return raw analysis
    for every region+disease combo currently above threshold."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    reports = db.query(SymptomReport).filter(SymptomReport.timestamp >= seven_days_ago).all()

    by_region = defaultdict(list)
    for r in reports:
        if r.region:
            by_region[r.region].append(r)

    detections = []
    for region, region_reports in by_region.items():
        for pattern in DISEASE_PATTERNS:
            analysis = analyze_region(region_reports, pattern)
            if analysis['risk'] != 'none':
                detections.append({
                    'region': region,
                    'report_count': len(region_reports),
                    'top_symptoms': get_top_symptoms(region_reports),
                    **analysis,
                })
    return detections


def sync_detections_to_alerts(db: Session, detections: list):
    """Reconcile live detections with the OutbreakAlert table.
    New detections become 'pending'. Detections that no longer meet
    threshold are left as-is (admin can still see history)."""
    for d in detections:
        existing = db.query(OutbreakAlert).filter(
            and_(
                OutbreakAlert.region == d['region'],
                OutbreakAlert.disease == d['disease'],
                OutbreakAlert.status.in_(['pending', 'approved']),
            )
        ).first()

        if existing:
            # Update the live numbers on the existing alert
            existing.risk = d['risk']
            existing.confidence = d['confidence']
            existing.reports_3day = d['reports_3day']
            existing.reports_7day = d['reports_7day']
        else:
            new_alert = OutbreakAlert(
                region=d['region'], disease=d['disease'],
                risk=d['risk'], confidence=d['confidence'],
                reports_3day=d['reports_3day'], reports_7day=d['reports_7day'],
                status='pending',
            )
            db.add(new_alert)
    db.commit()


# ── Public endpoints (used by Risk Map / Home) ─────────────────────────────────

@router.get("/summary")
async def get_outbreak_summary(db: Session = Depends(get_db)):
    """Public outbreak summary. Shows approved alerts only, unless
    auto-publish is enabled — in which case live detections show immediately."""
    detections = detect_all_outbreaks(db)
    sync_detections_to_alerts(db, detections)

    auto_publish = is_auto_publish_enabled(db)

    if auto_publish:
        visible_detections = detections
    else:
        approved = db.query(OutbreakAlert).filter(OutbreakAlert.status == 'approved').all()
        approved_keys = {(a.region, a.disease) for a in approved}
        visible_detections = [d for d in detections if (d['region'], d['disease']) in approved_keys]

    # Group back into per-region summary shape
    by_region = defaultdict(list)
    for d in visible_detections:
        by_region[d['region']].append(d)

    results = []
    for region, diseases in by_region.items():
        risk_order = {'emergency': 4, 'high': 3, 'medium': 2, 'low': 1}
        top_disease = max(diseases, key=lambda x: risk_order.get(x['risk'], 0))
        results.append({
            'district': region,
            'report_count': top_disease['report_count'],
            'top_symptoms': top_disease['top_symptoms'],
            'diseases': diseases,
            'risk': top_disease['risk'],
            'confidence': top_disease['confidence'],
        })

    results.sort(key=lambda x: {'emergency': 4, 'high': 3, 'medium': 2, 'low': 1}.get(x['risk'], 0), reverse=True)

    return {
        'districts': results,
        'total_reports_7day': sum(d['report_count'] for d in results) if results else 0,
        'regions_with_alerts': len([r for r in results if r['risk'] in ['high', 'emergency']]),
        'auto_publish': auto_publish,
        'generated_at': datetime.utcnow().isoformat(),
    }


@router.get("/region/{region}")
async def get_region_outbreak(region: str, db: Session = Depends(get_db)):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    reports_7day = db.query(SymptomReport).filter(
        and_(SymptomReport.region == region, SymptomReport.timestamp >= seven_days_ago)
    ).all()
    reports_30day = db.query(SymptomReport).filter(
        and_(SymptomReport.region == region, SymptomReport.timestamp >= thirty_days_ago)
    ).all()

    daily_counts = {}
    for i in range(14):
        day = (datetime.utcnow() - timedelta(days=i)).date().isoformat()
        daily_counts[day] = 0
    for r in reports_30day:
        day = r.timestamp.date().isoformat()
        if day in daily_counts:
            daily_counts[day] += 1

    auto_publish = is_auto_publish_enabled(db)
    approved = db.query(OutbreakAlert).filter(
        and_(OutbreakAlert.region == region, OutbreakAlert.status == 'approved')
    ).all()
    approved_diseases = {a.disease for a in approved}

    diseases = []
    for pattern in DISEASE_PATTERNS:
        analysis = analyze_region(reports_7day, pattern)
        if analysis['risk'] != 'none':
            if auto_publish or analysis['disease'] in approved_diseases:
                diseases.append(analysis)

    return {
        'region': region,
        'total_reports_7day': len(reports_7day),
        'top_symptoms': get_top_symptoms(reports_7day),
        'diseases': diseases,
        'daily_trend': [{'date': d, 'count': c} for d, c in sorted(daily_counts.items())],
    }


@router.get("/alerts")
async def get_active_alerts(db: Session = Depends(get_db)):
    summary = await get_outbreak_summary(db)
    alerts = [d for d in summary['districts'] if d['risk'] in ['high', 'emergency']]
    return {'alerts': alerts[:5], 'total': len(alerts)}


# ── Admin endpoints ──────────────────────────────────────────────────────────

@router.get("/queue")
async def get_review_queue(db: Session = Depends(get_db)):
    """Admin review queue — shows:
    - pending: awaiting first decision
    - approved: can be reverted back to pending anytime
    - rejected: visible for 3 days after rejection, then locked/hidden
    """
    detections = detect_all_outbreaks(db)
    sync_detections_to_alerts(db, detections)

    three_days_ago = datetime.utcnow() - timedelta(days=3)

    pending = db.query(OutbreakAlert).filter(
        OutbreakAlert.status == 'pending'
    ).order_by(OutbreakAlert.detected_at.desc()).all()

    approved = db.query(OutbreakAlert).filter(
        OutbreakAlert.status == 'approved'
    ).order_by(OutbreakAlert.reviewed_at.desc()).all()

    # Only show rejected items reviewed within the last 3 days
    rejected = db.query(OutbreakAlert).filter(
        and_(OutbreakAlert.status == 'rejected', OutbreakAlert.reviewed_at >= three_days_ago)
    ).order_by(OutbreakAlert.reviewed_at.desc()).all()

    def serialize(a, include_expiry=False):
        item = {
            'id': a.id, 'region': a.region, 'disease': a.disease,
            'risk': a.risk, 'confidence': a.confidence,
            'reports_3day': a.reports_3day, 'reports_7day': a.reports_7day,
            'detected_at': a.detected_at.isoformat(),
            'reviewed_at': a.reviewed_at.isoformat() if a.reviewed_at else None,
        }
        if include_expiry and a.reviewed_at:
            expires_at = a.reviewed_at + timedelta(days=3)
            hours_left = max(0, (expires_at - datetime.utcnow()).total_seconds() / 3600)
            item['expires_at'] = expires_at.isoformat()
            item['hours_left'] = round(hours_left, 1)
        return item

    return {
        'pending': [serialize(a) for a in pending],
        'approved': [serialize(a) for a in approved],
        'rejected': [serialize(a, include_expiry=True) for a in rejected],
    }


# Kept for backward compatibility
@router.get("/pending")
async def get_pending_alerts(db: Session = Depends(get_db)):
    queue = await get_review_queue(db)
    return {'pending': queue['pending'], 'total': len(queue['pending'])}


class ReviewAction(BaseModel):
    admin_note: Optional[str] = ""


@router.post("/alert/{alert_id}/approve")
async def approve_alert(alert_id: int, action: ReviewAction, db: Session = Depends(get_db)):
    alert = db.query(OutbreakAlert).filter(OutbreakAlert.id == alert_id).first()
    if not alert:
        return {"success": False, "error": "Alert not found"}
    alert.status = 'approved'
    alert.admin_note = action.admin_note or ""
    alert.reviewed_at = datetime.utcnow()
    db.commit()
    return {"success": True}


@router.post("/alert/{alert_id}/unapprove")
async def unapprove_alert(alert_id: int, db: Session = Depends(get_db)):
    """Admin made a mistake approving — revert back to pending. No time limit."""
    alert = db.query(OutbreakAlert).filter(OutbreakAlert.id == alert_id).first()
    if not alert:
        return {"success": False, "error": "Alert not found"}
    if alert.status != 'approved':
        return {"success": False, "error": "Alert is not currently approved"}
    alert.status = 'pending'
    alert.reviewed_at = None
    db.commit()
    return {"success": True}


@router.post("/alert/{alert_id}/reject")
async def reject_alert(alert_id: int, action: ReviewAction, db: Session = Depends(get_db)):
    alert = db.query(OutbreakAlert).filter(OutbreakAlert.id == alert_id).first()
    if not alert:
        return {"success": False, "error": "Alert not found"}
    alert.status = 'rejected'
    alert.admin_note = action.admin_note or ""
    alert.reviewed_at = datetime.utcnow()
    db.commit()
    return {"success": True}


@router.get("/settings")
async def get_settings(db: Session = Depends(get_db)):
    return {"auto_publish_outbreaks": is_auto_publish_enabled(db)}


class SettingUpdate(BaseModel):
    auto_publish_outbreaks: bool


@router.post("/settings")
async def update_settings(update: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == SETTING_KEY).first()
    value = "true" if update.auto_publish_outbreaks else "false"
    if setting:
        setting.value = value
    else:
        setting = SystemSetting(key=SETTING_KEY, value=value)
        db.add(setting)
    db.commit()
    return {"success": True, "auto_publish_outbreaks": update.auto_publish_outbreaks}
