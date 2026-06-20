from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import get_db, SymptomReport
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

# ── Outbreak detection rules ──────────────────────────────────────────────────
DISEASE_PATTERNS = [
    {
        'name': 'Malaria',
        'name_sw': 'Malaria',
        'keywords': ['fever', 'chills', 'headache', 'homa', 'baridi', 'maumivu ya kichwa'],
        'min_keywords': 2,
        'threshold_3day': 5,
        'threshold_7day': 10,
        'color': '#f59e0b',
        'icon': '🦟',
    },
    {
        'name': 'Cholera',
        'name_sw': 'Kipindupindu',
        'keywords': ['diarrhoea', 'vomiting', 'kuharisha', 'kutapika', 'diarrhea'],
        'min_keywords': 1,
        'threshold_3day': 5,
        'threshold_7day': 8,
        'color': '#0e7490',
        'icon': '💧',
    },
    {
        'name': 'Dengue',
        'name_sw': 'Dengue',
        'keywords': ['rash', 'joint pain', 'fever', 'upele', 'maumivu ya viungo', 'homa'],
        'min_keywords': 2,
        'threshold_3day': 3,
        'threshold_7day': 6,
        'color': '#dc2626',
        'icon': '🦟',
    },
    {
        'name': 'Respiratory Infection',
        'name_sw': 'Maambukizi ya Njia ya Hewa',
        'keywords': ['cough', 'breathing', 'throat', 'kikohozi', 'kupumua', 'koo'],
        'min_keywords': 1,
        'threshold_3day': 8,
        'threshold_7day': 15,
        'color': '#7c3aed',
        'icon': '🫁',
    },
    {
        'name': 'Typhoid',
        'name_sw': 'Homa ya Matumbo',
        'keywords': ['fever', 'stomach', 'abdomen', 'homa', 'tumbo', 'weak'],
        'min_keywords': 2,
        'threshold_3day': 5,
        'threshold_7day': 10,
        'color': '#92400e',
        'icon': '🤒',
    },
]

def symptom_matches_pattern(symptom_text: str, keywords: list) -> int:
    """Count how many keywords appear in the symptom text."""
    text = symptom_text.lower()
    return sum(1 for kw in keywords if kw.lower() in text)

def analyze_region(reports: list, pattern: dict) -> dict:
    """Analyze reports for a region against a disease pattern."""
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

    # Determine risk level
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
        'disease': pattern['name'],
        'disease_sw': pattern['name_sw'],
        'icon': pattern['icon'],
        'color': pattern['color'],
        'risk': risk,
        'confidence': round(confidence, 2),
        'reports_3day': matching_3day,
        'reports_7day': matching_7day,
    }

# ── API endpoints ─────────────────────────────────────────────────────────────

@router.get("/summary")
async def get_outbreak_summary(db: Session = Depends(get_db)):
    """Get outbreak risk summary for all regions."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    # Get all recent symptom reports grouped by region
    reports = db.query(SymptomReport).filter(
        SymptomReport.timestamp >= seven_days_ago
    ).all()

    # Group by region
    by_region = defaultdict(list)
    for r in reports:
        if r.region:
            by_region[r.region].append(r)

    # Analyze each region for each disease
    results = []
    for region, region_reports in by_region.items():
        region_result = {
            'district': region,
            'report_count': len(region_reports),
            'top_symptoms': get_top_symptoms(region_reports),
            'diseases': [],
            'risk': 'low',
            'confidence': 0.0,
        }

        highest_risk_score = 0
        for pattern in DISEASE_PATTERNS:
            analysis = analyze_region(region_reports, pattern)
            if analysis['risk'] != 'none':
                region_result['diseases'].append(analysis)
                risk_score = {'low': 1, 'medium': 2, 'high': 3, 'emergency': 4}.get(analysis['risk'], 0)
                if risk_score > highest_risk_score:
                    highest_risk_score = risk_score
                    region_result['risk'] = analysis['risk']
                    region_result['confidence'] = analysis['confidence']

        if region_result['diseases']:
            results.append(region_result)

    # Sort by risk level
    risk_order = {'emergency': 4, 'high': 3, 'medium': 2, 'low': 1}
    results.sort(key=lambda x: risk_order.get(x['risk'], 0), reverse=True)

    return {
        'districts': results,
        'total_reports_7day': len(reports),
        'regions_with_alerts': len([r for r in results if r['risk'] in ['high', 'emergency']]),
        'generated_at': datetime.utcnow().isoformat(),
    }

@router.get("/region/{region}")
async def get_region_outbreak(region: str, db: Session = Depends(get_db)):
    """Get detailed outbreak analysis for a specific region."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    reports_7day = db.query(SymptomReport).filter(
        and_(SymptomReport.region == region, SymptomReport.timestamp >= seven_days_ago)
    ).all()

    reports_30day = db.query(SymptomReport).filter(
        and_(SymptomReport.region == region, SymptomReport.timestamp >= thirty_days_ago)
    ).all()

    # Daily counts for trend chart (last 14 days)
    daily_counts = {}
    for i in range(14):
        day = (datetime.utcnow() - timedelta(days=i)).date().isoformat()
        daily_counts[day] = 0

    for r in reports_30day:
        day = r.timestamp.date().isoformat()
        if day in daily_counts:
            daily_counts[day] += 1

    diseases = []
    for pattern in DISEASE_PATTERNS:
        analysis = analyze_region(reports_7day, pattern)
        if analysis['risk'] != 'none':
            diseases.append(analysis)

    return {
        'region': region,
        'total_reports_7day': len(reports_7day),
        'top_symptoms': get_top_symptoms(reports_7day),
        'diseases': diseases,
        'daily_trend': [
            {'date': d, 'count': c}
            for d, c in sorted(daily_counts.items())
        ],
    }

@router.get("/alerts")
async def get_active_alerts(db: Session = Depends(get_db)):
    """Get only high/emergency outbreak alerts for home page display."""
    summary = await get_outbreak_summary(db)
    alerts = [
        d for d in summary['districts']
        if d['risk'] in ['high', 'emergency']
    ]
    return {
        'alerts': alerts[:5],  # top 5 most serious
        'total': len(alerts),
    }

def get_top_symptoms(reports: list) -> list:
    """Extract most common symptoms from a list of reports."""
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
