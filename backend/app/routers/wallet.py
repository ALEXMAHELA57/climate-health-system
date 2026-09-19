from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db, User, WalletTransaction
from app.routers.auth import get_current_user
import azampay

router = APIRouter()

BONUS_TIER = 6        # every N paid services unlocks a bonus
BONUS_RATE = 0.10      # 10% extra credit on the next top-up


def record_paid_service(user: User, db: Session):
    """Call this from anywhere a real payment just completed (Shop checkout,
    Consult Now, Pay Now, Lab payment, wallet spend) - tracks AfyaBonus
    eligibility. Does not commit; caller's existing db.commit() covers it."""
    user.paid_services_count = (user.paid_services_count or 0) + 1
    if user.paid_services_count % BONUS_TIER == 0:
        user.bonus_available = True


def spend_from_wallet(user: User, amount: float, description: str, db: Session) -> bool:
    """Deduct from wallet balance for an in-app purchase. Returns False if
    the balance is insufficient (caller should fall back to a normal
    AzamPay charge instead). Does not commit; caller's existing
    db.commit() covers it, and this also counts toward AfyaBonus."""
    if (user.wallet_balance or 0) < amount:
        return False
    user.wallet_balance -= amount
    db.add(WalletTransaction(owner_user_id=user.id, type="spend", amount=-amount, description=description))
    record_paid_service(user, db)
    return True


@router.get("/balance")
def get_balance(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    txns = db.query(WalletTransaction).filter(WalletTransaction.owner_user_id == user.id).order_by(WalletTransaction.created_at.desc()).limit(20).all()
    return {
        "balance": user.wallet_balance or 0,
        "paid_services_count": user.paid_services_count or 0,
        "services_until_bonus": BONUS_TIER - ((user.paid_services_count or 0) % BONUS_TIER) if not user.bonus_available else 0,
        "bonus_available": bool(user.bonus_available),
        "bonus_rate": BONUS_RATE,
        "transactions": [{"type": t.type, "amount": t.amount, "description": t.description, "created_at": t.created_at.isoformat()} for t in txns],
    }


class TopUpIn(BaseModel):
    amount: float
    payment_provider: str
    phone: str


@router.post("/topup")
async def top_up(data: TopUpIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.amount < 1000:
        return {"success": False, "error": "Minimum top-up is TZS 1,000"}

    payment = await azampay.checkout_mno(data.amount, data.phone, data.payment_provider, f"WEKEZA-{user.id}-{int(datetime.utcnow().timestamp())}", user.name or "AfyaHewa User")
    if not payment.get("success"):
        return {"success": False, "error": payment.get("error", "Payment could not be started")}

    credit = data.amount
    used_bonus = False
    if user.bonus_available:
        credit = data.amount * (1 + BONUS_RATE)
        user.bonus_available = False
        used_bonus = True

    user.wallet_balance = (user.wallet_balance or 0) + credit
    db.add(WalletTransaction(owner_user_id=user.id, type="top_up", amount=data.amount, description="Wallet top-up", azampay_ref=payment.get("transaction_id")))
    if used_bonus:
        bonus_amount = data.amount * BONUS_RATE
        db.add(WalletTransaction(owner_user_id=user.id, type="bonus", amount=bonus_amount, description=f"AfyaBonus - {int(BONUS_RATE*100)}% loyalty bonus"))
    db.commit()

    return {"success": True, "new_balance": user.wallet_balance, "bonus_applied": used_bonus}
