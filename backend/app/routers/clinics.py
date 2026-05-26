from fastapi import APIRouter

router = APIRouter()

CLINICS = {
    "Iringa": [
        {"name": "Iringa Regional Referral Hospital", "type": "hospital", "phone": "+255262702285", "hours": "24/7"},
        {"name": "Tosamaganga Hospital", "type": "hospital", "phone": "+255262702100", "hours": "24/7"},
        {"name": "Iringa Urban Health Centre", "type": "clinic", "phone": "+255262702300", "hours": "7am-9pm"},
    ],
    "Dar es Salaam": [
        {"name": "Muhimbili National Hospital", "type": "hospital", "phone": "+255222150610", "hours": "24/7"},
        {"name": "Amana Regional Hospital", "type": "hospital", "phone": "+255222861810", "hours": "24/7"},
    ],
    "Dodoma": [
        {"name": "Benjamin Mkapa Hospital", "type": "hospital", "phone": "+255262321666", "hours": "24/7"},
    ],
    "Mwanza": [
        {"name": "Bugando Medical Centre", "type": "hospital", "phone": "+255282500611", "hours": "24/7"},
    ],
    "Arusha": [
        {"name": "Mount Meru Regional Hospital", "type": "hospital", "phone": "+255272508321", "hours": "24/7"},
    ],
}

@router.get("/{district}")
async def get_clinics(district: str):
    return {"clinics": CLINICS.get(district, []), "emergency": "112"}