"""
AzamPay integration. Requires these env vars once you register for a
sandbox/production app at developers.azampay.co.tz:

  AZAMPAY_APP_NAME
  AZAMPAY_CLIENT_ID
  AZAMPAY_CLIENT_SECRET
  AZAMPAY_API_KEY
  AZAMPAY_ENV=sandbox   (or "production" once you have live credentials)

Until these are set, checkout/disbursement calls return a clear error
instead of crashing - same pattern as RESEND_API_KEY.
"""
import os
import httpx

AZAMPAY_APP_NAME = os.getenv("AZAMPAY_APP_NAME", "")
AZAMPAY_CLIENT_ID = os.getenv("AZAMPAY_CLIENT_ID", "")
AZAMPAY_CLIENT_SECRET = os.getenv("AZAMPAY_CLIENT_SECRET", "")
AZAMPAY_API_KEY = os.getenv("AZAMPAY_API_KEY", "")
AZAMPAY_ENV = os.getenv("AZAMPAY_ENV", "sandbox")

AUTH_URL = "https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken" if AZAMPAY_ENV == "sandbox" \
    else "https://authenticator.azampay.co.tz/AppRegistration/GenerateToken"
CHECKOUT_URL = "https://sandbox.azampay.co.tz/azampay/mno/checkout" if AZAMPAY_ENV == "sandbox" \
    else "https://checkout.azampay.co.tz/azampay/mno/checkout"
DISBURSE_URL = "https://sandbox.azampay.co.tz/azampay/api/v1/disbursement" if AZAMPAY_ENV == "sandbox" \
    else "https://checkout.azampay.co.tz/azampay/api/v1/disbursement"

def is_configured() -> bool:
    return bool(AZAMPAY_APP_NAME and AZAMPAY_CLIENT_ID and AZAMPAY_CLIENT_SECRET)

async def get_access_token() -> str:
    if not is_configured():
        raise RuntimeError("AzamPay is not configured yet - set AZAMPAY_APP_NAME/CLIENT_ID/CLIENT_SECRET")
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(AUTH_URL, json={
            "appName": AZAMPAY_APP_NAME, "clientId": AZAMPAY_CLIENT_ID, "clientSecret": AZAMPAY_CLIENT_SECRET,
        })
    data = res.json()
    token = data.get("data", {}).get("accessToken")
    if not token:
        raise RuntimeError(f"AzamPay auth failed: {data}")
    return token

async def checkout_mno(amount: float, phone: str, provider: str, external_id: str, name: str = ""):
    """Trigger a mobile money USSD push to the customer's phone. provider is
    one of: Airtel, Tigo, Halopesa, Azampesa, Mpesa."""
    if not is_configured():
        return {"success": False, "error": "Payments are not yet configured - AzamPay credentials pending"}
    try:
        token = await get_access_token()
    except Exception as e:
        return {"success": False, "error": f"Could not authenticate with AzamPay: {e}"}

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            CHECKOUT_URL,
            headers={"Authorization": f"Bearer {token}", "X-API-Key": AZAMPAY_API_KEY, "Content-Type": "application/json"},
            json={
                "accountNumber": phone, "amount": str(amount), "currencyCode": "TZS",
                "externalId": external_id, "provider": provider,
                "additionalProperties": {"propertyOne": name, "propertyTwo": "AfyaHewa Shop"},
            },
        )
    data = res.json()
    if res.status_code == 200:
        return {"success": True, "transaction_id": data.get("transactionId") or external_id, "raw": data}
    return {"success": False, "error": data.get("message", "Payment request failed"), "raw": data}

async def disburse(amount: float, phone: str, provider: str, external_id: str, name: str = ""):
    """Pay money out to a vendor's mobile wallet."""
    if not is_configured():
        return {"success": False, "error": "Payments are not yet configured - AzamPay credentials pending"}
    try:
        token = await get_access_token()
    except Exception as e:
        return {"success": False, "error": f"Could not authenticate with AzamPay: {e}"}

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            DISBURSE_URL,
            headers={"Authorization": f"Bearer {token}", "X-API-Key": AZAMPAY_API_KEY, "Content-Type": "application/json"},
            json={
                "accountNumber": phone, "amount": str(amount), "currencyCode": "TZS",
                "externalId": external_id, "provider": provider, "vendorName": name,
            },
        )
    data = res.json()
    if res.status_code == 200:
        return {"success": True, "reference": data.get("referenceId") or external_id, "raw": data}
    return {"success": False, "error": data.get("message", "Disbursement failed"), "raw": data}
