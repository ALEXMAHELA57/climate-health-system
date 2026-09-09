from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
import random
import string
import jwt
from passlib.context import CryptContext

from database import get_db, User, Vendor, Product, ShopOrder, SubOrder, VendorPayout, Admin
from app.routers.auth import get_current_user, JWT_SECRET, JWT_ALGO
from app.routers.admin_auth import get_current_admin
import azampay

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_vendor_jwt(vendor_id: int) -> str:
    payload = {"vendor_id": vendor_id, "type": "vendor", "exp": datetime.utcnow() + timedelta(days=90), "iat": datetime.utcnow()}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_vendor(authorization: str = Header(None), db: Session = Depends(get_db)) -> Vendor:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Vendor login required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("type") != "vendor":
        raise HTTPException(status_code=401, detail="Not a vendor session")
    vendor = db.query(Vendor).filter(Vendor.id == payload["vendor_id"], Vendor.active == True).first()
    if not vendor:
        raise HTTPException(status_code=401, detail="Vendor account not found")
    return vendor

CATEGORIES = {
    "medical_equipment":   {"en": "Medical Equipment",       "sw": "Vifaa vya Tiba"},
    "first_aid":           {"en": "First Aid",               "sw": "Huduma ya Kwanza"},
    "maternal_baby":       {"en": "Maternal & Baby",         "sw": "Mama na Mtoto"},
    "reproductive_health": {"en": "Reproductive Health",     "sw": "Afya ya Uzazi"},
    "personal_hygiene":    {"en": "Personal Hygiene",        "sw": "Usafi wa Kibinafsi"},
    "diabetes_supplies":   {"en": "Diabetes Supplies",       "sw": "Vifaa vya Kisukari"},
    "water_purification":  {"en": "Water Purification",      "sw": "Usafishaji wa Maji"},
    "mosquito_protection": {"en": "Mosquito Protection",     "sw": "Kinga dhidi ya Mbu"},
    "heat_protection":     {"en": "Climate/Heat Protection", "sw": "Kinga dhidi ya Joto"},
}
# NOTE: Medicines are deliberately excluded - see the proposal's Health
# Safety & Governance section. Selling prescription medicine online needs
# real pharmacy licensing (TMDA) before that category can be added.

def gen_id(prefix: str) -> str:
    return prefix + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

# ── Seed one starter vendor/products so the shop isn't empty ─────────────────
# NOTE: PLACEHOLDER. Replace with real, onboarded pharmacy/supplier partners.
def ensure_seed(db: Session):
    if db.query(Vendor).count() == 0:
        vendor = Vendor(name="AfyaHewa Partner Supplier", phone="", verified=True, active=True)
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        seed_products = [
            {"name": "Digital Thermometer", "category": "medical_equipment", "price": 12000, "stock": 50},
            {"name": "Blood Pressure Monitor", "category": "medical_equipment", "price": 45000, "stock": 20},
            {"name": "First Aid Kit (Basic)", "category": "first_aid", "price": 15000, "stock": 40},
            {"name": "Adhesive Bandages (Pack of 50)", "category": "first_aid", "price": 4000, "stock": 100},
            {"name": "Baby Diapers (Pack)", "category": "maternal_baby", "price": 18000, "stock": 60},
            {"name": "Pregnancy Test Kit", "category": "reproductive_health", "price": 5000, "stock": 80},
            {"name": "Condoms (Pack of 12)", "category": "reproductive_health", "price": 3000, "stock": 100},
            {"name": "Hand Sanitizer 250ml", "category": "personal_hygiene", "price": 4500, "stock": 90},
            {"name": "Glucose Test Strips (50)", "category": "diabetes_supplies", "price": 25000, "stock": 30},
            {"name": "Water Purification Tablets (30)", "category": "water_purification", "price": 6000, "stock": 70},
            {"name": "Mosquito Net (Treated)", "category": "mosquito_protection", "price": 12000, "stock": 45},
            {"name": "Insect Repellent Spray", "category": "mosquito_protection", "price": 7000, "stock": 60},
            {"name": "Cooling Towel", "category": "heat_protection", "price": 8000, "stock": 35},
        ]
        for p in seed_products:
            db.add(Product(vendor_id=vendor.id, active=True, **p))
        db.commit()

class VendorIn(BaseModel):
    name: str
    phone: str
    payout_provider: Optional[str] = ""
    payout_account: Optional[str] = ""

class ProductIn(BaseModel):
    vendor_id: int
    name: str
    category: str
    description: Optional[str] = ""
    price: float
    stock: int = 0
    image_url: Optional[str] = None

class CartItem(BaseModel):
    product_id: int
    quantity: int

class CheckoutIn(BaseModel):
    items: List[CartItem]
    delivery_name: str
    delivery_phone: str
    delivery_address: str
    payment_provider: str  # Mpesa | Tigo | Airtel | Halopesa | Azampesa

# ── Browse ──────────────────────────────────────────────────────────────

@router.get("/categories")
def list_categories():
    return {"categories": [{"id": k, **v} for k, v in CATEGORIES.items()]}

@router.get("/products")
def list_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    ensure_seed(db)
    q = db.query(Product).filter(Product.active == True, Product.stock > 0)
    if category:
        q = q.filter(Product.category == category)
    products = q.all()
    return {"products": [{
        "id": p.id, "vendor_id": p.vendor_id, "name": p.name, "category": p.category,
        "category_label": CATEGORIES.get(p.category, {}).get("en", p.category),
        "description": p.description, "price": p.price, "stock": p.stock, "image_url": p.image_url,
    } for p in products]}

# ── Checkout: single payment, splits into per-vendor sub-orders ──────────

@router.post("/checkout")
async def checkout(data: CheckoutIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not data.items:
        return {"success": False, "error": "Cart is empty"}

    by_vendor = {}
    total = 0.0
    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id, Product.active == True).first()
        if not product or product.stock < item.quantity:
            return {"success": False, "error": f"'{product.name if product else item.product_id}' is unavailable in that quantity"}
        line_total = product.price * item.quantity
        total += line_total
        by_vendor.setdefault(product.vendor_id, []).append({
            "product_id": product.id, "name": product.name, "price": product.price, "qty": item.quantity,
        })

    order_id = gen_id("ORD")
    order = ShopOrder(
        order_id=order_id, owner_user_id=user.id, total_amount=total, payment_status="pending",
        delivery_name=data.delivery_name, delivery_phone=data.delivery_phone, delivery_address=data.delivery_address,
    )
    db.add(order)

    for vendor_id, items in by_vendor.items():
        subtotal = sum(i["price"] * i["qty"] for i in items)
        db.add(SubOrder(order_id=order_id, vendor_id=vendor_id, items=json.dumps(items), subtotal=subtotal, status="pending"))

    db.commit()

    # Reduce stock immediately to prevent overselling while payment is pending
    for item in data.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock -= item.quantity
    db.commit()

    payment = await azampay.checkout_mno(total, data.delivery_phone, data.payment_provider, order_id, data.delivery_name)
    if payment.get("success"):
        order.azampay_ref = payment.get("transaction_id")
        db.commit()
        return {"success": True, "order_id": order_id, "message": "Check your phone to approve the payment"}
    else:
        return {"success": True, "order_id": order_id, "payment_pending": True, "payment_error": payment.get("error"),
                "message": "Order created, but payment could not be started automatically"}

@router.get("/orders/mine")
def list_my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(ShopOrder).filter(ShopOrder.owner_user_id == user.id).order_by(ShopOrder.created_at.desc()).all()
    result = []
    for o in orders:
        subs = db.query(SubOrder).filter(SubOrder.order_id == o.order_id).all()
        result.append({
            "order_id": o.order_id, "total_amount": o.total_amount, "payment_status": o.payment_status,
            "created_at": o.created_at.isoformat(),
            "sub_orders": [{"vendor_id": s.vendor_id, "items": json.loads(s.items), "subtotal": s.subtotal, "status": s.status} for s in subs],
        })
    return {"orders": result}

# ── AzamPay webhook - payment status callback ─────────────────────────────

class CallbackIn(BaseModel):
    externalId: Optional[str] = None
    transactionstatus: Optional[str] = None
    utilityref: Optional[str] = None

@router.post("/payment-callback")
def payment_callback(data: CallbackIn, db: Session = Depends(get_db)):
    if not data.externalId:
        return {"received": True}
    order = db.query(ShopOrder).filter(ShopOrder.order_id == data.externalId).first()
    if order:
        order.payment_status = "paid" if (data.transactionstatus or "").lower() == "success" else "failed"
        db.commit()
    return {"received": True}

# ── Admin: vendors, products, payouts ─────────────────────────────────────
# NOTE: same pre-existing gap as the rest of the admin system - not yet
# gated behind admin auth.

@router.post("/admin/vendors")
def create_vendor(data: VendorIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    vendor = Vendor(name=data.name, phone=data.phone, payout_provider=data.payout_provider, payout_account=data.payout_account, verified=False, active=True)
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return {"success": True, "vendor_id": vendor.id}

@router.get("/admin/vendors")
def list_vendors(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    vendors = db.query(Vendor).all()
    return {"vendors": [{"id": v.id, "name": v.name, "phone": v.phone, "verified": v.verified, "active": v.active} for v in vendors]}

@router.post("/admin/products")
def create_product(data: ProductIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    product = Product(**data.dict(), active=True)
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"success": True, "product_id": product.id}

@router.get("/admin/vendor-balances")
def vendor_balances(admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    """What's owed to each vendor from completed (delivered) sub-orders
    that haven't been paid out yet."""
    vendors = db.query(Vendor).filter(Vendor.active == True).all()
    result = []
    for v in vendors:
        subs = db.query(SubOrder).filter(SubOrder.vendor_id == v.id, SubOrder.status == "delivered").all()
        already_paid = db.query(VendorPayout).filter(VendorPayout.vendor_id == v.id, VendorPayout.status == "sent").all()
        owed = sum(s.subtotal for s in subs) - sum(p.amount + p.commission for p in already_paid)
        result.append({"vendor_id": v.id, "vendor_name": v.name, "owed": max(0, owed)})
    return {"balances": result}

class PayoutIn(BaseModel):
    vendor_id: int
    amount: float
    commission: float

@router.post("/admin/payouts")
async def trigger_payout(data: PayoutIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == data.vendor_id).first()
    if not vendor or not vendor.payout_account:
        return {"success": False, "error": "Vendor payout details not on file"}

    ref = gen_id("PAY")
    result = await azampay.disburse(data.amount, vendor.payout_account, vendor.payout_provider, ref, vendor.name)

    payout = VendorPayout(
        vendor_id=vendor.id, amount=data.amount, commission=data.commission,
        azampay_ref=result.get("reference") if result.get("success") else None,
        status="sent" if result.get("success") else "failed",
    )
    db.add(payout)
    db.commit()

    if not result.get("success"):
        return {"success": False, "error": result.get("error")}
    return {"success": True, "reference": result.get("reference")}

# ── Vendor self-service ────────────────────────────────────────────────────
# Vendors don't self-register - admin creates their login (below), then they
# manage their own products, orders, and see their own payout history.

class VendorLoginIn(BaseModel):
    username: str
    password: str

class AdminVendorLoginIn(BaseModel):
    username: str
    password: str

class VendorProductIn(BaseModel):
    name: str
    category: str
    description: Optional[str] = ""
    price: float
    stock: int = 0
    image_url: Optional[str] = None

class VendorProductUpdateIn(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    active: Optional[bool] = None

class SubOrderStatusIn(BaseModel):
    status: str  # processing | shipped | delivered

@router.post("/admin/vendors/{vendor_id}/set-login")
def admin_set_vendor_login(vendor_id: int, data: AdminVendorLoginIn, admin: Admin = Depends(get_current_admin), db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        return {"success": False, "error": "Vendor not found"}
    existing = db.query(Vendor).filter(Vendor.login_username == data.username, Vendor.id != vendor_id).first()
    if existing:
        return {"success": False, "error": "That username is already taken"}
    vendor.login_username = data.username
    vendor.password_hash = pwd_context.hash(data.password)
    db.commit()
    return {"success": True}

@router.post("/vendor/login")
def vendor_login(data: VendorLoginIn, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.login_username == data.username, Vendor.active == True).first()
    if not vendor or not vendor.password_hash or not pwd_context.verify(data.password, vendor.password_hash):
        return {"success": False, "error": "Incorrect username or password"}
    return {"success": True, "token": create_vendor_jwt(vendor.id), "vendor": {"id": vendor.id, "name": vendor.name}}

@router.get("/vendor/me")
def vendor_me(vendor: Vendor = Depends(get_current_vendor)):
    return {"vendor": {"id": vendor.id, "name": vendor.name, "phone": vendor.phone, "verified": vendor.verified,
                        "payout_provider": vendor.payout_provider, "payout_account": vendor.payout_account}}

@router.get("/vendor/products")
def vendor_products(vendor: Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.vendor_id == vendor.id).all()
    return {"products": [{
        "id": p.id, "name": p.name, "category": p.category, "description": p.description,
        "price": p.price, "stock": p.stock, "active": p.active,
    } for p in products]}

@router.post("/vendor/products")
def vendor_add_product(data: VendorProductIn, vendor: Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    product = Product(vendor_id=vendor.id, active=True, **data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"success": True, "product_id": product.id}

@router.patch("/vendor/products/{product_id}")
def vendor_update_product(product_id: int, data: VendorProductUpdateIn, vendor: Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.vendor_id == vendor.id).first()
    if not product:
        return {"success": False, "error": "Product not found"}
    for field, value in data.dict(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    return {"success": True}

@router.delete("/vendor/products/{product_id}")
def vendor_delete_product(product_id: int, vendor: Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.vendor_id == vendor.id).first()
    if not product:
        return {"success": False, "error": "Product not found"}
    product.active = False
    db.commit()
    return {"success": True}

@router.get("/vendor/orders")
def vendor_orders(vendor: Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    subs = db.query(SubOrder).filter(SubOrder.vendor_id == vendor.id).order_by(SubOrder.created_at.desc()).all()
    result = []
    for s in subs:
        order = db.query(ShopOrder).filter(ShopOrder.order_id == s.order_id).first()
        result.append({
            "sub_order_id": s.id, "order_id": s.order_id, "items": json.loads(s.items), "subtotal": s.subtotal,
            "status": s.status, "created_at": s.created_at.isoformat(),
            "delivery_name": order.delivery_name if order else "", "delivery_phone": order.delivery_phone if order else "",
            "delivery_address": order.delivery_address if order else "", "payment_status": order.payment_status if order else "unknown",
        })
    return {"orders": result}

@router.patch("/vendor/orders/{sub_order_id}/status")
def vendor_update_order_status(sub_order_id: int, data: SubOrderStatusIn, vendor: Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    sub = db.query(SubOrder).filter(SubOrder.id == sub_order_id, SubOrder.vendor_id == vendor.id).first()
    if not sub:
        return {"success": False, "error": "Order not found"}
    sub.status = data.status
    db.commit()
    return {"success": True}

@router.get("/vendor/payouts")
def vendor_payouts(vendor: Vendor = Depends(get_current_vendor), db: Session = Depends(get_db)):
    payouts = db.query(VendorPayout).filter(VendorPayout.vendor_id == vendor.id).order_by(VendorPayout.created_at.desc()).all()
    return {"payouts": [{"amount": p.amount, "status": p.status, "created_at": p.created_at.isoformat()} for p in payouts]}
