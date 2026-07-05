"""
AfyaHewa Alert Scheduler
Runs automatically every 6 hours to check weather + outbreak conditions
and sends SMS alerts to subscribers in affected regions.

Called from main.py on startup via APScheduler (lightweight, no Redis needed).
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, Subscriber, OutbreakAlert, SMSLog
import httpx
import logging

logger = logging.getLogger("afyahewa.scheduler")

# ── Weather risk thresholds ───────────────────────────────────────────────────
DISTRICT_COORDS = {
    'Iringa':        {'lat': -7.77,  'lon': 35.69},
    'Dar es Salaam': {'lat': -6.79,  'lon': 39.21},
    'Dodoma':        {'lat': -6.17,  'lon': 35.74},
    'Mwanza':        {'lat': -2.52,  'lon': 32.92},
    'Arusha':        {'lat': -3.39,  'lon': 36.68},
    'Mbeya':         {'lat': -8.91,  'lon': 33.46},
    'Morogoro':      {'lat': -6.82,  'lon': 37.66},
    'Tanga':         {'lat': -5.07,  'lon': 39.10},
    'Zanzibar West': {'lat': -6.17,  'lon': 39.20},
    'Kilimanjaro':   {'lat': -3.35,  'lon': 37.33},
    'Tabora':        {'lat': -5.02,  'lon': 32.80},
    'Kigoma':        {'lat': -4.88,  'lon': 29.63},
    'Lindi':         {'lat': -9.99,  'lon': 39.71},
    'Mtwara':        {'lat':-10.27,  'lon': 40.18},
    'Ruvuma':        {'lat':-10.68,  'lon': 35.65},
    'Shinyanga':     {'lat': -3.66,  'lon': 33.42},
    'Singida':       {'lat': -4.82,  'lon': 34.75},
    'Rukwa':         {'lat': -7.98,  'lon': 32.03},
    'Kagera':        {'lat': -1.33,  'lon': 31.82},
    'Mara':          {'lat': -1.77,  'lon': 34.00},
    'Geita':         {'lat': -2.87,  'lon': 32.23},
    'Simiyu':        {'lat': -2.63,  'lon': 34.22},
    'Njombe':        {'lat': -9.33,  'lon': 34.77},
    'Pwani':         {'lat': -7.07,  'lon': 38.67},
    'Manyara':       {'lat': -3.70,  'lon': 35.88},
    'Katavi':        {'lat': -6.33,  'lon': 31.08},
    'Pemba North':   {'lat': -5.03,  'lon': 39.77},
    'Pemba South':   {'lat': -5.32,  'lon': 39.72},
    'Zanzibar North':{'lat': -5.72,  'lon': 39.25},
    'Zanzibar South':{'lat': -6.38,  'lon': 39.52},
}

# Only alert subscribers if risk is HIGH or above — avoid alert fatigue
ALERT_THRESHOLD = {'high', 'emergency'}

# Templates under 160 chars each
SMS_TEMPLATES = {
    'weather_high': {
        'en': "AfyaHewa ALERT {region}: Heavy rain forecast. High malaria+flood risk. Sleep under net, store clean water. Emergency: 112",
        'sw': "AfyaHewa TAHADHARI {region}: Mvua nzito inatarajiwa. Hatari ya malaria na mafuriko. Lala chini ya neti. Dharura: 112"
    },
    'weather_emergency': {
        'en': "AfyaHewa URGENT {region}: Extreme weather/storm. STAY INDOORS. Risk of flooding. Call 112 in emergency.",
        'sw': "AfyaHewa HARAKA {region}: Hali mbaya ya hewa/dhoruba. KAA NDANI. Hatari ya mafuriko. Piga 112 kwa dharura."
    },
    'outbreak_approved': {
        'en': "AfyaHewa ALERT {region}: Possible {disease} cases reported. Seek care for symptoms. Nearest clinic: tap AfyaHewa app.",
        'sw': "AfyaHewa TAHADHARI {region}: Kesi za {disease} zimeripotiwa. Tafuta matibabu kwa dalili. Kliniki: tumia programu AfyaHewa."
    },
}

def get_weather_risk(rain7, max_temp, has_storm, max_daily):
    if has_storm and max_daily > 50: return 'emergency'
    if rain7 > 60 or (has_storm and max_daily > 25): return 'high'
    if rain7 > 25 or max_temp > 36: return 'medium'
    return 'low'

async def fetch_weather_risk(region: str, coords: dict) -> dict:
    """Fetch weather for a region and return risk level."""
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={coords['lat']}&longitude={coords['lon']}"
        f"&daily=temperature_2m_max,precipitation_sum,weather_code"
        f"&timezone=Africa/Dar_es_Salaam&forecast_days=7"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
            data = r.json()
            daily = data.get('daily', {})
            rain7    = sum(daily.get('precipitation_sum', [0]))
            max_temp = max(daily.get('temperature_2m_max', [0]))
            max_daily = max(daily.get('precipitation_sum', [0]))
            has_storm = any(c >= 95 for c in daily.get('weather_code', []))
            return {
                'region': region,
                'risk': get_weather_risk(rain7, max_temp, has_storm, max_daily),
                'rain7': round(rain7, 1),
                'has_storm': has_storm,
            }
    except Exception as e:
        logger.warning(f"Weather fetch failed for {region}: {e}")
        return {'region': region, 'risk': 'low', 'rain7': 0, 'has_storm': False}

async def send_sms_to_region(db: Session, region: str, message_en: str, message_sw: str, alert_type: str):
    """Send SMS to all active subscribers in a region."""
    from sms import send_beem_sms  # import here to avoid circular import
    subscribers = db.query(Subscriber).filter(
        Subscriber.active == True,
        Subscriber.region == region
    ).all()

    if not subscribers:
        return 0

    en_recips = [{"recipient_id": str(i), "dest_addr": s.phone}
                 for i, s in enumerate(subscribers) if s.language != 'sw']
    sw_recips = [{"recipient_id": str(i), "dest_addr": s.phone}
                 for i, s in enumerate(subscribers) if s.language == 'sw']

    sent = 0
    if en_recips:
        r = await send_beem_sms(en_recips, message_en[:160])
        sent += r['sent']
    if sw_recips:
        r = await send_beem_sms(sw_recips, message_sw[:160])
        sent += r['sent']

    # Log it
    log = SMSLog(
        phone=f"[auto {alert_type} {region}: {len(subscribers)} subs]",
        message=message_en[:160],
        region=region,
        status="sent" if sent > 0 else "failed",
    )
    db.add(log)
    db.commit()

    logger.info(f"Sent {sent}/{len(subscribers)} SMS for {alert_type} alert in {region}")
    return sent

async def run_weather_alerts():
    """Check weather risk for all regions, send alerts for high/emergency."""
    db = SessionLocal()
    try:
        # Only alert if we haven't already sent a weather alert for this
        # region in the last 12 hours (avoid spamming)
        twelve_hours_ago = datetime.utcnow() - timedelta(hours=12)
        recently_alerted = set(
            log.region for log in db.query(SMSLog)
            .filter(
                SMSLog.sent_at >= twelve_hours_ago,
                SMSLog.status == 'sent'
            ).all()
        )

        for region, coords in DISTRICT_COORDS.items():
            if region in recently_alerted:
                continue

            weather = await fetch_weather_risk(region, coords)
            risk = weather['risk']

            if risk not in ALERT_THRESHOLD:
                continue

            template_key = 'weather_emergency' if risk == 'emergency' else 'weather_high'
            msg_en = SMS_TEMPLATES[template_key]['en'].format(region=region)
            msg_sw = SMS_TEMPLATES[template_key]['sw'].format(region=region)

            await send_sms_to_region(db, region, msg_en, msg_sw, f"weather_{risk}")
            logger.info(f"Weather alert sent: {region} = {risk}")

    except Exception as e:
        logger.error(f"Weather alert run failed: {e}")
    finally:
        db.close()

async def run_outbreak_alerts():
    """Send SMS for newly approved outbreak alerts that haven't been notified yet."""
    db = SessionLocal()
    try:
        # Find approved outbreaks that haven't had an SMS sent yet
        # We track this by checking SMSLog for outbreak alerts per region+disease
        approved = db.query(OutbreakAlert).filter(
            OutbreakAlert.status == 'approved'
        ).all()

        for alert in approved:
            # Check if we already sent SMS for this specific outbreak alert
            already_sent = db.query(SMSLog).filter(
                SMSLog.region == alert.region,
                SMSLog.message.contains(f"[outbreak-{alert.id}]")
            ).first()

            if already_sent:
                continue

            msg_en = SMS_TEMPLATES['outbreak_approved']['en'].format(
                region=alert.region, disease=alert.disease
            )
            msg_sw = SMS_TEMPLATES['outbreak_approved']['sw'].format(
                region=alert.region, disease=alert.disease
            )
            # Tag the log with alert ID so we don't send it again
            msg_en_tagged = msg_en + f" [outbreak-{alert.id}]"

            await send_sms_to_region(
                db, alert.region,
                msg_en_tagged[:160],
                msg_sw[:160],
                f"outbreak_{alert.disease}"
            )

    except Exception as e:
        logger.error(f"Outbreak alert run failed: {e}")
    finally:
        db.close()

def create_scheduler() -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    scheduler = AsyncIOScheduler()

    # Weather alerts: every 6 hours starting at 6am Tanzania time (UTC+3 = 03:00 UTC)
    scheduler.add_job(
        run_weather_alerts,
        trigger='cron',
        hour='3,9,15,21',   # 6am, 12pm, 6pm, midnight Tanzania time
        minute=0,
        id='weather_alerts',
        replace_existing=True,
    )

    # Outbreak alerts: check every 2 hours — new approvals should notify quickly
    scheduler.add_job(
        run_outbreak_alerts,
        trigger='interval',
        hours=2,
        id='outbreak_alerts',
        replace_existing=True,
    )

    return scheduler
