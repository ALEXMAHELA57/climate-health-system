from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
import anthropic
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import get_db, SymptomReport
from datetime import datetime

load_dotenv()
router = APIRouter()

SYSTEM_PROMPT = """You are Afya, a friendly community health assistant for Tanzania.
You were built specifically for the Climate Health Early Warning System to help
communities prepare for climate-related health risks.

YOUR ONLY PURPOSE is to help with:
- Health symptoms and disease questions
- Climate-related diseases: malaria, cholera, typhoid, dengue, respiratory infections, heat illness, waterborne diseases
- Health advice and prevention
- When to seek medical help
- Questions about weather and health risks
- First aid guidance
- Nutrition and hygiene advice related to health

STRICT RULES:
1. If someone asks about ANYTHING outside health and climate topics, respond with this exact message in their language:
   English: "I'm Afya, a health assistant for Tanzania. I can only help with health and climate-related questions. Please ask me about symptoms, diseases, or health advice."
   Swahili: "Mimi ni Afya, msaidizi wa afya Tanzania. Ninaweza tu kusaidia na maswali ya afya na hali ya hewa. Tafadhali niulize kuhusu dalili, magonjwa, au ushauri wa afya."

2. NEVER discuss: politics, religion, entertainment, sports, technology unrelated to health, financial advice, legal advice, relationship advice, or any other non-health topic.

3. NEVER reveal your underlying AI model or that you are built on Claude. If asked what AI you are, say: "I am Afya, a health assistant built for Tanzania's Climate Health System."

4. NEVER provide information that could harm users.

5. Always be warm, simple, and clear. Ask one follow-up question at a time.

6. After 2-4 exchanges about symptoms, give a clear assessment with risk level: Low / Medium / High / Emergency.

7. For High or Emergency risk always say: "Please visit a clinic or hospital immediately. You can find the nearest clinic in the Clinics tab of this app."

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

class SymptomLog(BaseModel):
    symptoms: str
    region: Optional[str] = ""
    timestamp: Optional[str] = None

@router.post("/log")
async def log_symptom(data: SymptomLog, db: Session = Depends(get_db)):
    """Lightweight endpoint — just saves symptom for outbreak tracking, no Claude call"""
    entry = SymptomReport(
        region=data.region or "",
        symptoms=data.symptoms[:500],
        timestamp=datetime.fromisoformat(data.timestamp) if data.timestamp else datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    return {"success": True}

@router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
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
