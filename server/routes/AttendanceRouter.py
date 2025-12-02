from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta

from config.config import SECRET_KEY
from database.DB import get_db
from .dependencies import get_current_user, require_admin_or_volunteer

router = APIRouter()

security = HTTPBearer()

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 180


def verify_volunteer_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# Pydantic models
class QRScanRequest(BaseModel):
    team_id: str


@router.post("/scan")
async def scan_qr(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user=Depends(require_admin_or_volunteer),
    db = Depends(get_db)
):
    """
    Scans team QR (containing team_id). JWT in header proves event authorization.
    """
    # Parse request body manually to handle any format issues
    try:
        body = await request.json()
        print(f"DEBUG: Received scan body: {body}")
        
        team_id = body.get("team_id")
        
        if not team_id:
            raise HTTPException(status_code=422, detail="Missing team_id in request")
            
    except Exception as e:
        print(f"DEBUG: Error parsing scan request: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Invalid request format: {str(e)}")
    
    token = credentials.credentials
    payload = verify_volunteer_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired event token")

    event_id = payload["event_id"]
    volunteer_email = payload["sub"]

    event = await db.find_one("events", {"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    team = await db.find_one("teams", {"qr_id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if event.get("expired"):
        raise HTTPException(status_code=400, detail="Event expired")

    if event_id in team.get("events_participated", []):
        raise HTTPException(status_code=400, detail="Team already participated in this event")

    new_points = team.get("points", 0) + event.get("points", 0)

    await db.update("teams", {"qr_id": team_id}, {"$set": {"points": new_points}, "$push": {"events_participated": event_id}})

    await db.update("events", {"event_id": event_id}, {"$inc": {"participants": 1}})

    return {
        "message": f"✅ Team '{team['team_name']}' successfully scanned for event '{event['event_name']}'",
        "volunteer": volunteer_email,
        "points_awarded": event["points"],
        "team_points": new_points
    }
