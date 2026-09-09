from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, date

from database import get_db, User, FamilyProfile, FamilyLinkRequest
from app.routers.auth import get_current_user, calculate_age

router = APIRouter()

# ── Request models ───────────────────────────────────────────────────────

class ManagedProfileIn(BaseModel):
    relationship_type: str  # child | parent | spouse | dependent | other
    name: str
    date_of_birth: str
    gender: Optional[str] = None
    phone: Optional[str] = None
    consent_confirmed: Optional[bool] = False  # required if the person being added is an adult

class LinkRequestIn(BaseModel):
    relationship_type: str
    target_phone: Optional[str] = None
    target_email: Optional[str] = None

class LinkResponseIn(BaseModel):
    accept: bool

# ── Helpers ────────────────────────────────────────────────────────────────

def profile_public(p: FamilyProfile):
    age = calculate_age(p.date_of_birth) if p.date_of_birth else None
    return {
        "id": p.id, "relationship_type": p.relationship_type, "name": p.name,
        "date_of_birth": p.date_of_birth, "age": age, "gender": p.gender,
        "phone": p.phone, "is_minor": age is not None and age < 18,
        "linked_user_id": p.linked_user_id, "is_linked": p.linked_user_id is not None,
    }

# ── Managed profiles (children, or adults who opt not to have their own login) ─

@router.post("/profiles")
def add_managed_profile(data: ManagedProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    age = calculate_age(data.date_of_birth)
    is_minor = age < 18

    # Adults being added as a *managed* (not linked) profile require explicit consent,
    # since without it this would be a way to access another independent adult's
    # health data without their say. Children don't need this - the guardian has
    # full authority over a minor's profile.
    if not is_minor and not data.consent_confirmed:
        return {
            "success": False,
            "error": "Please confirm this person has agreed to have their profile managed here, or send them a link request instead so they keep their own account.",
        }

    profile = FamilyProfile(
        managed_by_user_id=user.id, relationship_type=data.relationship_type,
        name=data.name, date_of_birth=data.date_of_birth, gender=data.gender,
        phone=data.phone, consent_confirmed=data.consent_confirmed or is_minor,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"success": True, "profile": profile_public(profile)}

@router.get("/profiles")
def list_profiles(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profiles = db.query(FamilyProfile).filter(FamilyProfile.managed_by_user_id == user.id, FamilyProfile.active == True).all()
    return {"profiles": [profile_public(p) for p in profiles]}

@router.delete("/profiles/{profile_id}")
def remove_profile(profile_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FamilyProfile).filter(FamilyProfile.id == profile_id, FamilyProfile.managed_by_user_id == user.id).first()
    if not profile:
        return {"success": False, "error": "Profile not found"}
    profile.active = False
    db.commit()
    return {"success": True}

# ── Linked accounts (adults who keep their own independent login) ────────────

@router.post("/link-requests")
def send_link_request(data: LinkRequestIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not data.target_phone and not data.target_email:
        return {"success": False, "error": "Provide the phone number or email of the person you're inviting"}
    req = FamilyLinkRequest(
        requested_by_user_id=user.id, target_phone=data.target_phone,
        target_email=data.target_email, relationship_type=data.relationship_type,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    # Note: notifying the target person (SMS/email that they've been invited) is a
    # natural next step once this is wired to the frontend - not sent yet here.
    return {"success": True, "request_id": req.id}

@router.get("/link-requests/incoming")
def incoming_link_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Requests sent TO this user (matched by their own phone/email), pending their response."""
    q = db.query(FamilyLinkRequest).filter(FamilyLinkRequest.status == "pending")
    matches = []
    for r in q.all():
        if (user.phone and r.target_phone == user.phone) or (user.email and r.target_email == user.email):
            requester = db.query(User).filter(User.id == r.requested_by_user_id).first()
            matches.append({
                "request_id": r.id, "relationship_type": r.relationship_type,
                "requested_by_name": requester.name if requester else "Someone",
                "created_at": r.created_at.isoformat(),
            })
    return {"requests": matches}

@router.post("/link-requests/{request_id}/respond")
def respond_link_request(request_id: int, data: LinkResponseIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(FamilyLinkRequest).filter(FamilyLinkRequest.id == request_id, FamilyLinkRequest.status == "pending").first()
    if not req:
        return {"success": False, "error": "Request not found or already responded to"}

    is_target = (user.phone and req.target_phone == user.phone) or (user.email and req.target_email == user.email)
    if not is_target:
        return {"success": False, "error": "This request wasn't sent to you"}

    req.status = "accepted" if data.accept else "declined"
    req.responded_at = datetime.utcnow()

    if data.accept:
        requester = db.query(User).filter(User.id == req.requested_by_user_id).first()
        profile = FamilyProfile(
            managed_by_user_id=req.requested_by_user_id, relationship_type=req.relationship_type,
            name=user.name or (user.phone or user.email), date_of_birth=user.date_of_birth or "",
            gender=user.gender, phone=user.phone, consent_confirmed=True, linked_user_id=user.id,
        )
        db.add(profile)

    db.commit()
    return {"success": True}
