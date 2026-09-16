from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import anthropic
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import get_db, SymptomReport, Admin
from app.routers.admin_auth import get_current_admin
from datetime import datetime

load_dotenv()
router = APIRouter()

SYSTEM_PROMPT = """You are Afya, a friendly community health and environment assistant for Tanzania.
You were built for the Climate Health Early Warning System to help communities
with their health and with the environment they live in.

YOUR PURPOSE is to help with anything genuinely about health or the environment, including:
- Health symptoms, diseases, prevention, and treatment guidance
- General wellness: nutrition, exercise, sleep, hygiene, healthy habits
- Vaccination and immunization questions
- Public health topics: outbreaks, health system navigation, general health policy
- Climate-related diseases: malaria, cholera, typhoid, dengue, respiratory infections, heat illness, waterborne diseases
- When to seek medical help, and first aid guidance
- Weather and its health impacts
- Broader environmental topics: pollution (air, water, soil), water quality and access, waste management,
  deforestation, conservation, sustainability, agriculture's relationship to health and environment,
  disaster preparedness (floods, droughts), and general environmental education

STRICT RULES:
1. If someone asks about something genuinely outside health and environment, respond with this exact message in their language:
   English: "I'm Afya, a health and environment assistant for Tanzania. I can only help with questions related to health or the environment."
   Swahili: "Mimi ni Afya, msaidizi wa afya na mazingira Tanzania. Ninaweza tu kusaidia na maswali yanayohusiana na afya au mazingira."

2. NEVER discuss: politics unrelated to health/environmental policy, religion, entertainment, sports, technology unrelated to health/environment, financial advice, legal advice unrelated to health/environmental rights, relationship advice, or any other unrelated topic.

3. NEVER reveal your underlying AI model or that you are built on Claude. If asked what AI you are, say: "I am Afya, a health and environment assistant built for Tanzania's Climate Health System."

4. NEVER provide information that could harm users.

5. Always be warm, simple, and clear. Ask one follow-up question at a time.

6. After 2-4 exchanges about symptoms, give a clear assessment with risk level: Low / Medium / High / Emergency.

7. For High or Emergency risk, or whenever the user asks for the nearest clinic/hospital, respond with:
   English: "Please visit a clinic or hospital. Tap [OPEN CLINICS TAB] below to find the nearest one with contact details. For any emergency call 112 immediately."
   Swahili: "Tafadhali nenda kliniki au hospitali. Bonyeza [FUNGUA KLINIKI] hapa chini kupata iliyo karibu pamoja na mawasiliano. Kwa dharura yoyote piga simu 112 mara moja."

7b. If the user asks to see a doctor/specialist, or if based on what they've described you think they
   should see one (not just self-manage at home), respond with:
   English: "It would be worth talking to a doctor about this. Tap [OPEN DOCTORS TAB] below to see who's available. For any emergency call 112 immediately."
   Swahili: "Ni vyema kuzungumza na daktari kuhusu hili. Bonyeza [FUNGUA MADAKTARI] hapa chini kuona nani anapatikana. Kwa dharura yoyote piga simu 112 mara moja."
   The tags [OPEN CLINICS TAB], [FUNGUA KLINIKI], [OPEN DOCTORS TAB], and [FUNGUA MADAKTARI] become
   clickable buttons in the app - always include the relevant one exactly as written. Never invent or
   name a specific doctor yourself - the button shows the real, current list, which you can't see.

8. Respond in the same language the user writes in (English or Swahili).

9. Keep responses concise — 3-5 sentences unless giving a full assessment.

10. Never use markdown formatting like **bold** or ## headers. Write in plain text only.
"""

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]
    region: Optional[str] = ""
    topic: Optional[str] = ""  # e.g. "Mental Health", "Men's Reproductive Health" - scopes Afya's focus

class SymptomLog(BaseModel):
    symptoms: str
    region: Optional[str] = ""
    timestamp: Optional[str] = None

# Severe symptom signals — these don't name a specific disease, they just
# flag a report as needing urgent human review by health authorities.
# This is intentionally NOT a diagnostic tool for high-consequence pathogens
# (Ebola, Marburg, etc) — only lab testing can confirm those. This is a
# safety net so unusual severe reports don't get lost in normal symptom logs.
SEVERE_SIGNALS = [
    'bleeding', 'blood', 'damu', 'kutokwa damu',
    'unexplained death', 'died suddenly', 'kufa ghafla',
    'severe bruising', 'michubuko mikali',
    'multiple people sick', 'watu wengi wagonjwa',
    'animal die off', 'wanyama wamekufa',
]

def is_severe_report(symptoms: str) -> bool:
    text = symptoms.lower()
    return any(signal in text for signal in SEVERE_SIGNALS)

@router.post("/log")
async def log_symptom(data: SymptomLog, db: Session = Depends(get_db)):
    """Lightweight endpoint — just saves symptom for outbreak tracking, no Claude call"""
    severe = is_severe_report(data.symptoms)
    entry = SymptomReport(
        region=data.region or "",
        symptoms=data.symptoms[:500],
        timestamp=datetime.fromisoformat(data.timestamp) if data.timestamp else datetime.utcnow(),
        flagged_severe=severe,
    )
    db.add(entry)
    db.commit()
    return {"success": True, "flagged_severe": severe}

@router.get("/ping")
async def ping():
    return {"status": "ok"}

@router.get("/severe")
async def get_severe_reports(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Returns recent symptom reports flagged as needing urgent human review."""
    reports = db.query(SymptomReport).filter(
        SymptomReport.flagged_severe == True
    ).order_by(SymptomReport.timestamp.desc()).limit(50).all()
    return {
        "reports": [
            {
                "id": r.id,
                "region": r.region,
                "symptoms": r.symptoms,
                "timestamp": r.timestamp.isoformat(),
            } for r in reports
        ],
        "total": len(reports),
    }

@router.delete("/{report_id}")
async def delete_symptom_report(report_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Admin-only deletion of a symptom report — e.g. spam, duplicate, or false flag.
    Permanently removes it from outbreak detection calculations."""
    report = db.query(SymptomReport).filter(SymptomReport.id == report_id).first()
    if not report:
        return {"success": False, "error": "Report not found"}
    db.delete(report)
    db.commit()
    return {"success": True}

@router.post("/{report_id}/dismiss")
async def dismiss_severe_flag(report_id: int, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Admin reviewed the severe flag and determined it's not urgent —
    clears the flag but keeps the report for outbreak statistics."""
    report = db.query(SymptomReport).filter(SymptomReport.id == report_id).first()
    if not report:
        return {"success": False, "error": "Report not found"}
    report.flagged_severe = False
    db.commit()
    return {"success": True}

@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    system_prompt = SYSTEM_PROMPT
    if request.topic:
        system_prompt += (
            f"\n\nThe user has opened the '{request.topic}' section of the app, so focus your "
            f"guidance on that topic unless they clearly ask about something else. Stay within "
            f"the same health-only, non-diagnostic boundaries described above."
        )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,   # reduced for faster response
        system=system_prompt,
        messages=[{"role": m.role, "content": m.content} for m in request.messages]
    )
    reply = response.content[0].text

    # Save symptom report anonymously to DB
    if request.region and len(request.messages) >= 1:
        first_user_msg = next((m.content for m in request.messages if m.role == "user"), "")
        if first_user_msg:
            symptom_entry = SymptomReport(
                region=request.region,
                symptoms=first_user_msg[:500],
                timestamp=datetime.utcnow()
            )
            db.add(symptom_entry)
            db.commit()

    return {"reply": reply}
