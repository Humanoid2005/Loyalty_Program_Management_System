from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta

from config.config import SECRET_KEY
from database.DB import get_db
from .dependencies import get_current_user, require_admin, require_admin_or_volunteer
from helpers.SecretCodeEncryptionStrategy import SecretCodeEncryptionStrategy

router = APIRouter()

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 180

# Helper instances for encryption/decryption
_secret_code_strategy = SecretCodeEncryptionStrategy(SECRET_KEY)


def decrypt_secret_code(encrypted_text: str) -> str:
    """Decrypt encrypted_text using AES-GCM"""
    return _secret_code_strategy.decrypt(encrypted_text)


def create_volunteer_token(volunteer_email: str, event_id: str):
    payload = {
        "sub": volunteer_email,
        "event_id": event_id,
        "exp": datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_volunteer_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# Pydantic models
class VolunteerCreate(BaseModel):
    rollNumber: str
    name: str
    email: str


class VolunteerEventAuth(BaseModel):
    event_id: str
    secret_code: str


@router.post('')
async def add_volunteer(volunteer_data: VolunteerCreate, request: Request, admin_user: dict = Depends(require_admin), db = Depends(get_db)):
    """Add a new volunteer (Admin only)"""
    try:
        existing_volunteer = await db.find_one("volunteers", {"rollNumber": volunteer_data.rollNumber})
        if existing_volunteer:
            raise HTTPException(status_code=400, detail="Volunteer with this roll number already exists")

        volunteer = {
            "rollNumber": volunteer_data.rollNumber,
            "name": volunteer_data.name,
            "email": volunteer_data.email,
        }

        result = await db.add("volunteers", volunteer)
        if result["status"] == 200:
            return JSONResponse(content={"message": "Volunteer added successfully", "volunteer": result["data"]})
        else:
            raise HTTPException(status_code=500, detail="Failed to add volunteer")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding volunteer: {str(e)}")


@router.get('')
async def get_volunteers(request: Request, user: dict = Depends(require_admin_or_volunteer), db = Depends(get_db)):
    """Get all volunteers (Admin and Volunteer access)"""
    try:
        result = await db.find_many("volunteers")
        volunteers = result["data"] if result["status"] == 200 else []

        return JSONResponse(content={"volunteers": volunteers})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching volunteers: {str(e)}")


@router.delete('/{roll_number}')
async def remove_volunteer(roll_number: str, request: Request, admin_user: dict = Depends(require_admin), db = Depends(get_db)):
    """Remove a volunteer (Admin only)"""
    try:
        result = await db.delete("volunteers", {"rollNumber": roll_number})
        if result["deleted_count"] == 0:
            raise HTTPException(status_code=404, detail="Volunteer not found")

        return JSONResponse(content={"message": "Volunteer removed successfully"})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing volunteer: {str(e)}")


@router.get('/{roll_number}')
async def get_volunteer(roll_number: str, request: Request, user: dict = Depends(require_admin_or_volunteer), db = Depends(get_db)):
    """Get a specific volunteer by roll number (Admin and Volunteer access)"""
    try:
        volunteer = await db.find_one("volunteers", {"rollNumber": roll_number})
        if not volunteer:
            raise HTTPException(status_code=404, detail="Volunteer not found")

        return JSONResponse(content={"volunteer": volunteer})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching volunteer: {str(e)}")


@router.post("/authorize")
async def authorize_volunteer(
    request: Request,
    user=Depends(require_admin_or_volunteer),
    db = Depends(get_db)
):
    """
    Authorize a logged-in volunteer for an event using secret code.
    Returns a short-lived JWT token bound to that event.
    """
    # Parse request body manually to handle any format issues
    try:
        body = await request.json()
        
        event_id = body.get("event_id")
        secret_code = body.get("secret_code")
        
        if not event_id or not secret_code:
            raise HTTPException(status_code=422, detail="Missing event_id or secret_code in request")
            
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid request format: {str(e)}")
    
    email = user["email"]
    role = user["role"]

    event = await db.find_one("events", {"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Decrypt the incoming secret code before comparison
    try:
        decrypted_code = decrypt_secret_code(secret_code)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Unable to decrypt secret code: {str(e)}")

    if decrypted_code != event.get("secret_code"):
        raise HTTPException(status_code=401, detail="Invalid secret code")

    token = create_volunteer_token(email, event_id)
    return {
        "message": f"Authorization successful for event '{event['event_name']}'",
        "volunteer_email": email,
        "role": role,
        "token": token
    }
