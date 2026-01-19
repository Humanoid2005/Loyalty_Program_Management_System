from fastapi import APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from helpers.SecretCodeEncryptionStrategy import SecretCodeEncryptionStrategy
from config.config import SECRET_KEY
from database.DB import get_db
from .dependencies import get_current_user, require_admin

router = APIRouter()

# Helper instances
_secret_code_strategy = SecretCodeEncryptionStrategy(SECRET_KEY)


def encrypt_secret_code(plain_text: str) -> str:
    """Encrypt plain_text using AES-GCM"""
    return _secret_code_strategy.encrypt(plain_text)


def decrypt_secret_code(encrypted_text: str) -> str:
    """Decrypt encrypted_text using AES-GCM"""
    return _secret_code_strategy.decrypt(encrypted_text)


# Pydantic models
class EventCreate(BaseModel):
    event_name: str
    points: int
    secret_code: str


class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    secret_code: Optional[str] = None
    points: Optional[int] = None
    expired: Optional[bool] = None


@router.post('')
async def create_event(request: Request, event_data: EventCreate, admin_user: dict = Depends(require_admin), db = Depends(get_db)):
    """Create a new event (Admin only)"""
    try:
        # Decrypt the incoming secret code
        try:
            decrypted_secret = decrypt_secret_code(event_data.secret_code)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Unable to decrypt secret code: {str(e)}")
        
        event_id = str(uuid.uuid4())
        event = {
            "event_id": event_id,
            "event_name": event_data.event_name,
            "points": event_data.points,
            "secret_code": decrypted_secret,
            "expired": False,
            "participants": 0,
        }

        result = await db.add("events", event)
        if result["status"] == 200:
            event = result["data"]
            event["secret_code"] = encrypt_secret_code(event.get("secret_code", ""))
            return JSONResponse(content={"message": "Event created successfully", "event": event})
        else:
            raise HTTPException(status_code=500, detail="Failed to create event")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")


@router.get('')
async def get_events(request: Request, user: dict = Depends(get_current_user), ids: Optional[str] = Query(None), db = Depends(get_db)):
    """Get all events or specific events by IDs"""
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        # Handle query parameter for specific event IDs
        if ids:
            id_list = ids.split(",")
            event_collection = db.get_collection("events")
            events = await event_collection.find(
                {"event_id": {"$in": id_list}},
                {"_id": 0, "event_id": 1, "event_name": 1, "points": 1}
            ).to_list(None)
            return events
        
        # Get all events
        result = await db.find_many("events")
        if result["status"] == 200:
            events = result["data"]
            for event in events:
                event["secret_code"] = encrypt_secret_code(event.get("secret_code", ""))
            return JSONResponse(content={"events": events})
        else:
            return JSONResponse(content={"events": []})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)}")


@router.put('/{event_id}')
async def update_event(event_id: str, event_data: EventUpdate, request: Request, admin_user: dict = Depends(require_admin), db = Depends(get_db)):
    """Update an existing event (Admin only)"""
    try:
        update_data = {}

        if event_data.event_name is not None:
            update_data["event_name"] = event_data.event_name
        if event_data.points is not None:
            update_data["points"] = event_data.points
        if event_data.expired is not None:
            update_data["expired"] = event_data.expired
        if event_data.secret_code is not None:
            try:
                decrypted_code = decrypt_secret_code(event_data.secret_code)
                update_data["secret_code"] = decrypted_code
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Unable to decrypt secret code: {str(e)}")

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = admin_user["email"]

        result = await db.update("events", {"event_id": event_id}, {"$set": update_data})

        if result["matched_count"] == 0:
            raise HTTPException(status_code=404, detail="Event not found")

        updated_event = await db.find_one("events", {"event_id": event_id})
        if updated_event:
            updated_event["secret_code"] = encrypt_secret_code(updated_event.get("secret_code", ""))

        return JSONResponse(content={"message": "Event updated successfully", "event": updated_event})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating event: {str(e)}")


@router.delete('/{event_id}')
async def delete_event(event_id: str, request: Request, admin_user: dict = Depends(require_admin), db = Depends(get_db)):
    """Delete an event (Admin only)"""
    try:
        result = await db.delete("events", {"event_id": event_id})
        if result["deleted_count"] == 0:
            raise HTTPException(status_code=404, detail="Event not found")

        return JSONResponse(content={"message": "Event deleted successfully"})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting event: {str(e)}")
