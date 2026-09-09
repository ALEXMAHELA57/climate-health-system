from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db, User, MedicalRecord
from app.routers.auth import get_current_user

router = APIRouter()

# Real, validated screening tools. Fixed wording and fixed scoring formula -
# see the design discussion: these are only clinically meaningful if asked
# exactly the same way every time, which is why this is a structured form,
# not something the AI phrases conversationally.
ASSESSMENTS = {
    "phq9": {
        "name_en": "PHQ-9 (Depression Screening)", "name_sw": "PHQ-9 (Uchunguzi wa Msongo wa Mawazo)",
        "domain": "mental_health",
        "instructions_en": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
        "instructions_sw": "Katika wiki 2 zilizopita, ni mara ngapi umesumbuliwa na matatizo yafuatayo?",
        "options": [
            {"value": 0, "en": "Not at all", "sw": "Hapana kabisa"},
            {"value": 1, "en": "Several days", "sw": "Siku chache"},
            {"value": 2, "en": "More than half the days", "sw": "Zaidi ya nusu ya siku"},
            {"value": 3, "en": "Nearly every day", "sw": "Karibu kila siku"},
        ],
        "questions": [
            {"en": "Little interest or pleasure in doing things", "sw": "Hamu au furaha kidogo katika kufanya mambo"},
            {"en": "Feeling down, depressed, or hopeless", "sw": "Kuhisi huzuni, msongo, au kukosa matumaini"},
            {"en": "Trouble falling or staying asleep, or sleeping too much", "sw": "Tatizo la kulala au kulala sana"},
            {"en": "Feeling tired or having little energy", "sw": "Kuhisi uchovu au nguvu kidogo"},
            {"en": "Poor appetite or overeating", "sw": "Hamu mbaya ya chakula au kula kupita kiasi"},
            {"en": "Feeling bad about yourself, or that you are a failure", "sw": "Kujihisi vibaya, au kwamba wewe ni mshindwa"},
            {"en": "Trouble concentrating on things", "sw": "Tatizo la kuzingatia mambo"},
            {"en": "Moving or speaking slowly, or being fidgety/restless", "sw": "Kusonga au kuongea polepole, au kutotulia"},
            {"en": "Thoughts that you would be better off dead, or of hurting yourself", "sw": "Mawazo ya kuwa afadhali ufe, au kujidhuru"},
        ],
        "crisis_question_index": 8,  # question 9 (0-indexed) - self-harm/suicidal ideation
        "bands": [
            (0, 4, "minimal", "Kidogo Sana"),
            (5, 9, "mild", "Kidogo"),
            (10, 14, "moderate", "Wastani"),
            (15, 19, "moderately severe", "Wastani Mkali"),
            (20, 27, "severe", "Mkali"),
        ],
    },
    "gad7": {
        "name_en": "GAD-7 (Anxiety Screening)", "name_sw": "GAD-7 (Uchunguzi wa Wasiwasi)",
        "domain": "mental_health",
        "instructions_en": "Over the last 2 weeks, how often have you been bothered by the following problems?",
        "instructions_sw": "Katika wiki 2 zilizopita, ni mara ngapi umesumbuliwa na matatizo yafuatayo?",
        "options": [
            {"value": 0, "en": "Not at all", "sw": "Hapana kabisa"},
            {"value": 1, "en": "Several days", "sw": "Siku chache"},
            {"value": 2, "en": "More than half the days", "sw": "Zaidi ya nusu ya siku"},
            {"value": 3, "en": "Nearly every day", "sw": "Karibu kila siku"},
        ],
        "questions": [
            {"en": "Feeling nervous, anxious, or on edge", "sw": "Kuhisi wasiwasi, hofu, au mkazo"},
            {"en": "Not being able to stop or control worrying", "sw": "Kutoweza kuacha au kudhibiti wasiwasi"},
            {"en": "Worrying too much about different things", "sw": "Kuwa na wasiwasi mkubwa kuhusu mambo mbalimbali"},
            {"en": "Trouble relaxing", "sw": "Tatizo la kupumzika"},
            {"en": "Being so restless that it's hard to sit still", "sw": "Kutotulia sana hadi ni vigumu kukaa tuli"},
            {"en": "Becoming easily annoyed or irritable", "sw": "Kukasirika au kuudhika kwa urahisi"},
            {"en": "Feeling afraid as if something awful might happen", "sw": "Kuhisi hofu kana kwamba jambo baya litatokea"},
        ],
        "crisis_question_index": None,
        "bands": [
            (0, 4, "minimal", "Kidogo Sana"),
            (5, 9, "mild", "Kidogo"),
            (10, 14, "moderate", "Wastani"),
            (15, 21, "severe", "Mkali"),
        ],
    },
}

class SubmitIn(BaseModel):
    answers: List[int]
    family_profile_id: Optional[int] = None

@router.get("")
def list_assessments():
    return {"assessments": [
        {"id": k, "name_en": v["name_en"], "name_sw": v["name_sw"], "domain": v["domain"]}
        for k, v in ASSESSMENTS.items()
    ]}

@router.get("/{assessment_id}")
def get_assessment(assessment_id: str):
    a = ASSESSMENTS.get(assessment_id)
    if not a:
        return {"success": False, "error": "Assessment not found"}
    return {"success": True, "assessment": a}

@router.post("/{assessment_id}/submit")
def submit_assessment(assessment_id: str, data: SubmitIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = ASSESSMENTS.get(assessment_id)
    if not a:
        return {"success": False, "error": "Assessment not found"}
    if len(data.answers) != len(a["questions"]):
        return {"success": False, "error": "Answer count doesn't match question count"}
    if any(ans < 0 or ans > 3 for ans in data.answers):
        return {"success": False, "error": "Invalid answer value"}

    score = sum(data.answers)
    band, band_sw = "unknown", "Haijulikani"
    for low, high, en, sw in a["bands"]:
        if low <= score <= high:
            band, band_sw = en, sw
            break

    crisis_flag = False
    if a["crisis_question_index"] is not None:
        crisis_flag = data.answers[a["crisis_question_index"]] > 0

    # Save as a verified record - this came from a real structured clinical
    # tool, not free-text self-report.
    record = MedicalRecord(
        owner_user_id=user.id, family_profile_id=data.family_profile_id,
        record_type="assessment", title=a["name_en"],
        description=f"Score: {score}, Severity: {band}",
        source="verified_afyahewa", date_recorded=datetime.utcnow().strftime("%Y-%m-%d"),
    )
    db.add(record)
    db.commit()

    return {
        "success": True, "score": score, "max_score": len(a["questions"]) * 3,
        "band": band, "band_sw": band_sw, "crisis_flag": crisis_flag,
    }
