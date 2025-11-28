from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime
import httpx
import json
from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Query
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import hashlib
import base64

from config import (
    CLIENT_ID, CLIENT_SECRET, SESSION_SECRET_KEY, ADMIN_EMAIL, REDIS_URL,
    FRONTEND_URL, MONGODB_USERNAME, MONGODB_PASSWORD, CLUSTER_NAME,
    DATABASE_NAME, APP_NAME, DEADLINE_DATE, SECRET_KEY
)
from models import User, Event, Volunteer

''' The backend API Endpoints setup '''
app = FastAPI()

print(f"Configuring CORS middleware first...")
print(f"FRONTEND_URL from config = {FRONTEND_URL}")

allowed_origins = [FRONTEND_URL]
if FRONTEND_URL != "http://localhost:5173":
    allowed_origins.append("http://localhost:5173")

print(f"Final allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

security = HTTPBearer()

if not SESSION_SECRET_KEY:
    raise ValueError("SESSION_SECRET_KEY environment variable not set!")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    session_cookie="session",
    max_age=3600,
    same_site="none",
    https_only=True
)

# ============================================================
# OOP: VISITOR + STRATEGY IMPLEMENTATIONS
# (No change in function names or logic usage below; just wrapped)
# ============================================================

class DateTimeSerializerVisitor:
    """Visitor to convert datetime in nested structures to ISO strings."""
    def visit(self, obj):
        if isinstance(obj, dict):
            result = {}
            for key, value in obj.items():
                result[key] = self.visit(value)
            return result
        elif isinstance(obj, list):
            return [self.visit(item) for item in obj]
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return obj

_datetime_serializer_visitor = DateTimeSerializerVisitor()


class SecretCodeEncryptionStrategy:
    """
    Strategy class for secret_code encryption/decryption using AES-GCM.
    This replaces the imperative logic but keeps the original
    encrypt_secret_code / decrypt_secret_code function names and behavior.
    """
    def __init__(self, secret_key: str):
        self._key = hashlib.sha256(secret_key.encode()).digest()
        self._aesgcm = AESGCM(self._key)

    @property
    def key(self) -> bytes:
        return self._key

    def encrypt(self, plain_text: str) -> str:
        if not plain_text:
            return ""
        iv = os.urandom(12)
        ciphertext = self._aesgcm.encrypt(iv, plain_text.encode("utf-8"), None)
        combined = iv + ciphertext
        return base64.urlsafe_b64encode(combined).decode("utf-8")

    def decrypt(self, encrypted_text: str) -> str:
        if not encrypted_text:
            return ""
        try:
            combined = base64.urlsafe_b64decode(encrypted_text.encode("utf-8"))
            iv = combined[:12]
            ciphertext = combined[12:]
            plaintext = self._aesgcm.decrypt(iv, ciphertext, None)
            return plaintext.decode("utf-8")
        except Exception as e:
            print(f"Decryption error: {e}")
            return ""

_secret_code_strategy = SecretCodeEncryptionStrategy(SECRET_KEY)

# ============================================================
# MongoDB setup (same logic, just as before)
# ============================================================

try:
    print(f"Attempting MongoDB connection...")
    print(f"Cluster Name: {CLUSTER_NAME}")
    print(f"Database Name: {DATABASE_NAME}")
    print(f"App Name: {APP_NAME}")
    print(f"Username: {MONGODB_USERNAME}")

    MONGO_URI = f"mongodb+srv://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@{CLUSTER_NAME}.mongodb.net/?retryWrites=true&w=majority&appName={APP_NAME}"

    import socket
    hostname = f"{CLUSTER_NAME}.mongodb.net"
    print(f"Testing DNS resolution for: {hostname}")
    dns_success = False

    try:
        ip = socket.gethostbyname(hostname)
        print(f"Standard DNS resolution successful: {hostname} -> {ip}")
        dns_success = True
    except socket.gaierror as dns_error:
        print(f"Standard DNS resolution failed: {dns_error}")
        try:
            socket.setdefaulttimeout(10)
            ip = socket.gethostbyname(hostname)
            print(f" DNS resolution with timeout successful: {hostname} -> {ip}")
            dns_success = True
        except socket.gaierror as dns_error2:
            print(f" DNS resolution with timeout also failed: {dns_error2}")

    if not dns_success:
        print("\n DNS RESOLUTION TROUBLESHOOTING:")
        print("1. Check if you're behind a corporate firewall/proxy")
        print("2. Try using a different DNS server (8.8.8.8 or 1.1.1.1)")
        print("3. Check if MongoDB Atlas is accessible from your network")
        print("4. Verify the cluster name in MongoDB Atlas dashboard")
        print("\n  Continuing without DNS verification - connection may still work...")

    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    volunteer_collection = db.volunteers
    teams_collection = db.teams
    user_collection = db.users
    event_collection = db.events

    print("MongoDB connection initialized successfully")
except Exception as mongo_e:
    print(f"MongoDB connection error: {mongo_e}")
    client = None
    db = None
    volunteer_collection = None
    event_collection = None

# ============================================================
# Pydantic models (unchanged)
# ============================================================

class EventCreate(BaseModel):
    event_name: str
    points: int
    secret_code: str


class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    secret_code: str
    points: Optional[int] = None
    expired: Optional[bool] = None


class VolunteerCreate(BaseModel):
    rollNumber: str
    name: str
    email: str


class EventCodeVerify(BaseModel):
    event_name: str
    input_secret_code: str


class VolunteerMark(BaseModel):
    team_id: str
    event_name: str


class TeamCreate(BaseModel):
    team_name: Optional[str] = None


class TeamAction(BaseModel):
    team_id: str


class VolunteerEventAuth(BaseModel):
    event_id: str
    secret_code: str


class QRScanRequest(BaseModel):
    team_id: str

# ============================================================
# Helper functions now backed by Visitor / Strategy (OOP)
# ============================================================

def serialize_datetime_fields(obj):
    """Convert datetime objects in a dictionary to ISO format strings via Visitor."""
    return _datetime_serializer_visitor.visit(obj)


ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 180


def get_encryption_key() -> bytes:
    """Derive a 32-byte AES key from SECRET_KEY using SHA-256 (via strategy)."""
    return _secret_code_strategy.key


def encrypt_secret_code(plain_text: str) -> str:
    """
    Encrypt plain_text using AES-GCM with a 256-bit key derived from SECRET_KEY.
    Returns urlsafe-base64 encoded string (iv || ciphertext_with_tag).
    Strategy-based implementation; behavior unchanged.
    """
    return _secret_code_strategy.encrypt(plain_text)


def decrypt_secret_code(encrypted_text: str) -> str:
    """
    Decrypt encrypted_text using AES-GCM.
    Returns the original plaintext.
    Strategy-based implementation; behavior unchanged.
    """
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


async def get_current_user(request: Request):
    user = request.session.get('user')
    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    return user


async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_admin_or_volunteer(user: dict = Depends(get_current_user)):
    if user.get("role") not in ["admin", "volunteer"]:
        raise HTTPException(status_code=403, detail="Admin or volunteer access required")
    return user

# ============================================================
# OAuth configuration (unchanged)
# ============================================================

oauth = OAuth()
oauth.register(
    name='microsoft',
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    server_metadata_url='https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile User.Read',
        'verify_iss': False
    }
)

# ============================================================
# Routes (logic unchanged, still using same variable names)
# ============================================================

@app.get('/api/login')
async def login(request: Request):
    redirect_uri = request.url_for('auth')
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)


@app.get('/api/auth')
async def auth(request: Request):
    try:
        if not hasattr(request, 'session') or request.session is None:
            request.session = {}

        code = request.query_params.get('code')
        if not code:
            return JSONResponse(status_code=400, content={"error": "No authorization code received"})

        token_url = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"

        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                token_url,
                data={
                    'client_id': CLIENT_ID,
                    'client_secret': CLIENT_SECRET,
                    'code': code,
                    'grant_type': 'authorization_code',
                    'redirect_uri': str(request.url_for('auth')),
                    'scope': 'openid email profile User.Read'
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )

            if token_response.status_code != 200:
                print(f"Token exchange failed: {token_response.text}")
                return JSONResponse(status_code=401, content={
                    "error": "Token exchange failed",
                    "details": token_response.text
                })

            token_data = token_response.json()
            access_token = token_data.get('access_token')

            if not access_token:
                return JSONResponse(status_code=401, content={
                    "error": "No access token received",
                    "details": str(token_data)
                })

            user_response = await client.get(
                'https://graph.microsoft.com/v1.0/me',
                headers={'Authorization': f'Bearer {access_token}'}
            )

            if user_response.status_code != 200:
                return JSONResponse(status_code=401, content={
                    "error": "Failed to get user info",
                    "details": user_response.text
                })

            user_data = user_response.json()

        email = user_data.get("mail") or user_data.get("userPrincipalName")

        if not email or not email.endswith('@iiitb.ac.in'):
            return JSONResponse(
                status_code=403,
                content={"error": "Access Denied: Only users with an 'iiitb.ac.in' email can log in."}
            )

        name = user_data.get("displayName")
        roll_number = user_data.get("employeeId", "N/A")

        role = "participant"
        if email.lower() == ADMIN_EMAIL.lower():
            role = "admin"
        else:
            try:
                is_volunteer = await volunteer_collection.find_one({"email": email.lower()})
                if is_volunteer:
                    role = "volunteer"
            except Exception as db_e:
                print(f"Database error when checking volunteer status: {db_e}")

        processed_user = {
            "name": name,
            "email": email,
            "rollNumber": roll_number,
            "role": role
        }

        request.session.clear()
        request.session['user'] = processed_user

        redirect_url = f"{FRONTEND_URL}/{processed_user['role']}"
        response = RedirectResponse(url=redirect_url, status_code=302)
        return response

    except Exception as e:
        print(f"OAuth error details: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=401, content={
            "error": "Authorization failed",
            "details": str(e),
            "error_type": type(e).__name__
        })


@app.get('/api/health')
async def health_check():
    """Simple health check endpoint"""
    return JSONResponse(content={"status": "healthy", "message": "Server is running"})


@app.get('/api/debug/session')
async def debug_session(request: Request):
    """Debug endpoint to inspect request data during CORS/cookie debugging"""

    origin = request.headers.get("origin", "NO ORIGIN")
    print("\n=== Debug Session Request ===")
    print(f"Request origin: {origin}")
    print(f"Configured FRONTEND_URL: {FRONTEND_URL}")
    print(f"Origin in allowed_origins: {origin in allowed_origins}")

    print("\nRequest headers:")
    for k, v in request.headers.items():
        print(f"  {k}: {v}")

    print("\nRequest cookies:")
    for k, v in request.cookies.items():
        print(f"  {k}: {v}")

    session_data = None
    try:
        if hasattr(request, "session"):
            session_data = dict(request.session) if request.session else {}
            print("\nSession data:", session_data)
        else:
            print("\nNo session attribute on request")
            session_data = {"error": "No session attribute found"}
    except Exception as e:
        print(f"\nError reading session: {str(e)}")
        session_data = {"error": f"Unable to read session: {str(e)}"}

    response = JSONResponse(content={
        "timestamp": datetime.utcnow().isoformat(),
        "request": {
            "origin": origin,
            "headers": dict(request.headers),
            "cookies": dict(request.cookies)
        },
        "server": {
            "frontend_url": FRONTEND_URL,
            "allowed_origins": allowed_origins,
            "origin_allowed": origin in allowed_origins
        },
        "session": {
            "data": session_data,
            "exists": hasattr(request, "session"),
            "has_user": bool(session_data and session_data.get("user"))
        }
    })

    print("\nResponse headers that will be sent:")
    for k, v in response.headers.items():
        print(f"  {k}: {v}")
    print("=== End Debug Session ===\n")

    return response


@app.get('/api/user/profile')
async def user_profile(request: Request):
    user = request.session.get('user')
    if user:
        return JSONResponse(content=user)
    return JSONResponse(status_code=401, content={"error": "User not authenticated"})


@app.get('/api/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url=FRONTEND_URL or "/")


@app.post('/api/events')
async def create_event(request: Request, event_data: EventCreate, admin_user: dict = Depends(require_admin)):
    """Create a new event (Admin only)"""
    try:
        event_id = str(uuid.uuid4())
        event = {
            "event_id": event_id,
            "event_name": event_data.event_name,
            "points": event_data.points,
            "secret_code": event_data.secret_code,
            "expired": False,
            "participants": 0,
        }

        result = await event_collection.insert_one(event)
        if result.inserted_id:
            event["_id"] = str(result.inserted_id)
            event = serialize_datetime_fields(event)
            event["secret_code"] = encrypt_secret_code(event.get("secret_code", ""))
            return JSONResponse(content={"message": "Event created successfully", "event": event})
        else:
            raise HTTPException(status_code=500, detail="Failed to create event")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")


@app.get('/api/events')
async def get_events(request: Request, user: dict = Depends(get_current_user)):
    """Get all events"""
    if event_collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        events = []
        async for event in event_collection.find():
            event["_id"] = str(event["_id"])
            event = serialize_datetime_fields(event)
            event["secret_code"] = encrypt_secret_code(event.get("secret_code", ""))
            events.append(event)

        return JSONResponse(content={"events": events})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching events: {str(e)}")


@app.put('/api/events/{event_id}')
async def update_event(event_id: str, event_data: EventUpdate, request: Request, admin_user: dict = Depends(require_admin)):
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
            decrypted_code = decrypt_secret_code(event_data.secret_code)
            if (decrypted_code is not None):
                update_data["secret_code"] = decrypted_code
            else:
                raise HTTPException(status=422, detail="Unable to decrypt secret code from user request")

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = admin_user["email"]

        result = await event_collection.update_one(
            {"event_id": event_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")

        updated_event = await event_collection.find_one({"event_id": event_id})
        if updated_event:
            updated_event["_id"] = str(updated_event["_id"])
            updated_event = serialize_datetime_fields(updated_event)
            updated_event["secret_code"] = encrypt_secret_code(updated_event.get("secret_code", ""))

        return JSONResponse(content={"message": "Event updated successfully", "event": updated_event})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating event: {str(e)}")


@app.delete('/api/events/{event_id}')
async def delete_event(event_id: str, request: Request, admin_user: dict = Depends(require_admin)):
    """Delete an event (Admin only)"""
    try:
        result = await event_collection.delete_one({"event_id": event_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")

        return JSONResponse(content={"message": "Event deleted successfully"})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting event: {str(e)}")


@app.post('/api/volunteers')
async def add_volunteer(volunteer_data: VolunteerCreate, request: Request, admin_user: dict = Depends(require_admin)):
    """Add a new volunteer (Admin only)"""
    try:
        existing_volunteer = await volunteer_collection.find_one({"rollNumber": volunteer_data.rollNumber})
        if existing_volunteer:
            raise HTTPException(status_code=400, detail="Volunteer with this roll number already exists")

        volunteer = {
            "rollNumber": volunteer_data.rollNumber,
            "name": volunteer_data.name,
            "email": volunteer_data.email,
        }

        result = await volunteer_collection.insert_one(volunteer)
        if result.inserted_id:
            volunteer["_id"] = str(result.inserted_id)
            volunteer = serialize_datetime_fields(volunteer)
            return JSONResponse(content={"message": "Volunteer added successfully", "volunteer": volunteer})
        else:
            raise HTTPException(status_code=500, detail="Failed to add volunteer")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding volunteer: {str(e)}")


@app.get('/api/volunteers')
async def get_volunteers(request: Request, user: dict = Depends(require_admin_or_volunteer)):
    """Get all volunteers (Admin and Volunteer access)"""
    try:
        volunteers = []
        async for volunteer in volunteer_collection.find():
            volunteer["_id"] = str(volunteer["_id"])
            volunteer = serialize_datetime_fields(volunteer)
            volunteers.append(volunteer)

        return JSONResponse(content={"volunteers": volunteers})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching volunteers: {str(e)}")


@app.delete('/api/volunteers/{roll_number}')
async def remove_volunteer(roll_number: str, request: Request, admin_user: dict = Depends(require_admin)):
    """Remove a volunteer (Admin only)"""
    try:
        result = await volunteer_collection.delete_one({"rollNumber": roll_number})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Volunteer not found")

        return JSONResponse(content={"message": "Volunteer removed successfully"})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing volunteer: {str(e)}")


@app.get('/api/volunteers/{roll_number}')
async def get_volunteer(roll_number: str, request: Request, user: dict = Depends(require_admin_or_volunteer)):
    """Get a specific volunteer by roll number (Admin and Volunteer access)"""
    try:
        volunteer = await volunteer_collection.find_one({"rollNumber": roll_number})
        if not volunteer:
            raise HTTPException(status_code=404, detail="Volunteer not found")

        volunteer["_id"] = str(volunteer["_id"])
        volunteer = serialize_datetime_fields(volunteer)
        return JSONResponse(content={"volunteer": volunteer})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching volunteer: {str(e)}")


@app.post("/api/volunteer/authorize")
async def authorize_volunteer(
    data: VolunteerEventAuth,
    request: Request,
    user=Depends(require_admin_or_volunteer)
):
    """
    Authorize a logged-in volunteer for an event using secret code.
    Returns a short-lived JWT token bound to that event.
    """
    email = user["email"]
    role = user["role"]

    event = await event_collection.find_one({"event_id": data.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if data.secret_code != event.get("secret_code"):
        raise HTTPException(status_code=401, detail="Invalid secret code")

    token = create_volunteer_token(email, data.event_id)
    return {
        "message": f"Authorization successful for event '{event['event_name']}'",
        "volunteer_email": email,
        "role": role,
        "token": token
    }


@app.post("/api/volunteer/scan")
async def scan_qr(
    data: QRScanRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user=Depends(require_admin_or_volunteer)
):
    """
    Scans team QR (containing team_id). JWT in header proves event authorization.
    """
    token = credentials.credentials
    payload = verify_volunteer_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired event token")

    event_id = payload["event_id"]
    volunteer_email = payload["sub"]

    event = await event_collection.find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    team = await teams_collection.find_one({"qr_id": data.team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if event.get("expired"):
        raise HTTPException(status_code=400, detail="Event expired")

    if event_id in team.get("events_participated", []):
        raise HTTPException(status_code=400, detail="Team already participated in this event")

    new_points = team.get("points", 0) + event.get("points", 0)

    teams_collection.update_one(
        {"qr_id": data.team_id},
        {"$set": {"points": new_points}, "$push": {"events_participated": event_id}}
    )

    event_collection.update_one({"event_id": event_id}, {"$inc": {"participants": 1}})

    return {
        "message": f"✅ Team '{team['team_name']}' successfully scanned for event '{event['event_name']}'",
        "volunteer": volunteer_email,
        "points_awarded": event["points"],
        "team_points": new_points
    }


@app.get("/api/events")
async def get_events(ids: str = Query(...)):
    try:
        id_list = ids.split(",")
        events = await event_collection.find(
            {"event_id": {"$in": id_list}},
            {"_id": 0, "event_id": 1, "event_name": 1, "points": 1}
        ).to_list(None)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/leave_team')
async def leave_team(payload: TeamAction, request: Request, user: dict = Depends(get_current_user)):
    """Remove the requesting user from the team if before DEADLINE_DATE."""
    if teams_collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        if DEADLINE_DATE:
            try:
                deadline_dt = datetime.fromisoformat(DEADLINE_DATE)
            except Exception:
                try:
                    deadline_dt = datetime.strptime(DEADLINE_DATE, "%Y-%m-%d")
                except Exception:
                    deadline_dt = None

            if deadline_dt:
                now = datetime.utcnow()
                if now > deadline_dt:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Cannot leave team after the deadline."})

        team = await teams_collection.find_one({"team_id": payload.team_id})
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        email = user.get("email")
        found = False

        for m in team.get("members", []):
            if m.get("email") == email:
                found = True
                break

        if not found:
            return JSONResponse(status_code=400, content={"success": False, "message": "User is not a member of this team."})

        res = await teams_collection.update_one({"team_id": payload.team_id}, {"$pull": {"members": {"email": email}}})
        if res.matched_count == 0:
            raise HTTPException(status_code=500, detail="Failed to remove member from team")

        updated_team = await teams_collection.find_one({"team_id": payload.team_id})

        if updated_team and "_id" in updated_team:
            updated_team["_id"] = str(updated_team["_id"])

        updated_team = serialize_datetime_fields(updated_team) if updated_team else updated_team

        return JSONResponse(status_code=200, content={"success": True, "message": "Left team successfully.", "team": updated_team})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leaving team: {str(e)}")


import hashlib
import base64


def generate_team_qr_id(team_id: str) -> str:
    """Generate a unique, short hashed ID for team QR code"""
    hash_object = hashlib.sha256(team_id.encode())
    hash_bytes = hash_object.digest()
    short_hash = base64.urlsafe_b64encode(hash_bytes[:12]).decode('utf-8').rstrip('=')
    return short_hash


def generate_team_join_code(team_id: str, team_name: str) -> str:
    """Generate a short join code for team invitation"""
    combined = f"{team_id}-{team_name}"
    hash_object = hashlib.sha256(combined.encode())
    hash_bytes = hash_object.digest()
    short_code = base64.urlsafe_b64encode(hash_bytes[:6]).decode('utf-8').rstrip('=')
    return short_code


@app.post('/api/create_team')
async def create_team(payload: TeamCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new team with the requesting user as the only member."""
    if teams_collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        if DEADLINE_DATE:
            try:
                deadline_dt = datetime.fromisoformat(DEADLINE_DATE)
            except Exception:
                try:
                    deadline_dt = datetime.strptime(DEADLINE_DATE, "%Y-%m-%d")
                except Exception:
                    deadline_dt = None

            if deadline_dt and datetime.utcnow() > deadline_dt:
                return JSONResponse(status_code=400, content={"success": False, "message": "Cannot create team after the deadline."})

        team_name = payload.team_name
        if team_name:
            existing_name = await teams_collection.find_one({"team_name": team_name})
            if existing_name:
                return JSONResponse(status_code=400, content={"success": False, "message": "Team name already taken. Choose a different name."})

        email = user.get("email")
        if email:
            already_in = await teams_collection.find_one({"members.email": email})
            if already_in:
                return JSONResponse(status_code=400, content={"success": False, "message": "User already belongs to a team and cannot create another."})

        team_id = str(uuid.uuid4())
        team_name = team_name or f"Team-{team_id[:8]}"

        member = {
            "name": user.get("name"),
            "email": user.get("email"),
            "rollNumber": user.get("rollNumber"),
            "role": user.get("role")
        }

        qr_id = generate_team_qr_id(team_id)
        join_code = generate_team_join_code(team_id, team_name)

        team = {
            "team_id": team_id,
            "team_name": team_name,
            "qr_id": qr_id,
            "join_code": join_code,
            "members": [member],
            "points": 0,
            "events_participated": [],
            "created_at": datetime.utcnow(),
            "created_by": user.get("email")
        }

        result = await teams_collection.insert_one(team)
        if result.inserted_id:
            team["_id"] = str(result.inserted_id)
            team = serialize_datetime_fields(team)
            return JSONResponse(status_code=201, content={"message": "Team created successfully", "team": team})
        else:
            raise HTTPException(status_code=500, detail="Failed to create team")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating team: {str(e)}")


@app.get('/api/my_team')
async def get_my_team(request: Request, user: dict = Depends(get_current_user)):
    """Get the team that the current user belongs to"""
    if teams_collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available")

    try:
        email = user.get("email")
        if not email:
            return JSONResponse(status_code=400, content={"error": "User roll number not found"})

        team = await teams_collection.find_one({"members.email": email})
        if not team:
            return JSONResponse(content={"team": None, "message": "User not in any team"})

        if "_id" in team:
            team["_id"] = str(team["_id"])

        team = serialize_datetime_fields(team)

        if not team.get("qr_id"):
            team["qr_id"] = generate_team_qr_id(team["team_id"])
        if not team.get("join_code"):
            team["join_code"] = generate_team_join_code(team["team_id"], team["team_name"])

        if not team.get("qr_id") or not team.get("join_code"):
            await teams_collection.update_one(
                {"team_id": team["team_id"]},
                {"$set": {
                    "qr_id": team["qr_id"],
                    "join_code": team["join_code"]
                }}
            )

        return JSONResponse(content={"team": team})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team: {str(e)}")


@app.post('/api/join_team_by_code')
async def join_team_by_code(request: Request, user: dict = Depends(get_current_user)):
    """Join a team using a join code"""
    if teams_collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available")

    try:
        body = await request.json()
        join_code = body.get("join_code")

        if not join_code:
            return JSONResponse(status_code=400, content={"success": False, "message": "Join code is required"})

        if DEADLINE_DATE:
            try:
                deadline_dt = datetime.fromisoformat(DEADLINE_DATE)
            except Exception:
                try:
                    deadline_dt = datetime.strptime(DEADLINE_DATE, "%Y-%m-%d")
                except Exception:
                    deadline_dt = None

            if deadline_dt and datetime.utcnow() > deadline_dt:
                return JSONResponse(status_code=400, content={"success": False, "message": "Cannot join team after the deadline"})

        matching_team = await teams_collection.find_one({"join_code": join_code})

        if not matching_team:
            teams_cursor = teams_collection.find()
            async for team in teams_cursor:
                team_join_code = generate_team_join_code(team["team_id"], team["team_name"])
                if team_join_code == join_code:
                    matching_team = team
                    await teams_collection.update_one(
                        {"team_id": team["team_id"]},
                        {"$set": {"join_code": join_code}}
                    )
                    break

        if not matching_team:
            return JSONResponse(status_code=404, content={"success": False, "message": "Invalid join code"})

        if len(matching_team.get("members", [])) >= 3:
            return JSONResponse(status_code=400, content={"success": False, "message": "Team is full (maximum 3 members)"})

        email = user.get("email")
        if email:
            existing_team = await teams_collection.find_one({"members.email": email})
            if existing_team:
                if existing_team.get("team_id") == matching_team["team_id"]:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Already a member of this team"})
                else:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Already belongs to another team"})

        member = {
            "name": user.get("name"),
            "email": user.get("email"),
            "rollNumber": user.get("rollNumber"),
            "role": user.get("role")
        }

        res = await teams_collection.update_one(
            {"team_id": matching_team["team_id"]},
            {"$push": {"members": member}}
        )

        if res.matched_count == 0:
            raise HTTPException(status_code=500, detail="Failed to add member to team")

        updated_team = await teams_collection.find_one({"team_id": matching_team["team_id"]})

        if updated_team and "_id" in updated_team:
            updated_team["_id"] = str(updated_team["_id"])

        updated_team = serialize_datetime_fields(updated_team) if updated_team else updated_team

        if not updated_team.get("qr_id"):
            updated_team["qr_id"] = generate_team_qr_id(updated_team["team_id"])
        if not updated_team.get("join_code"):
            updated_team["join_code"] = generate_team_join_code(updated_team["team_id"], updated_team["team_name"])

        return JSONResponse(status_code=200, content={"success": True, "message": "Joined team successfully", "team": updated_team})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error joining team: {str(e)}")


@app.get("/api/leaderboard/full")
async def leaderboard_full():
    """Return all teams with only name and points, sorted by points descending."""
    if teams_collection is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection not available. Please check MongoDB configuration."
        )

    try:
        teams = []
        cursor = teams_collection.find({}, {"_id": 1, "team_name": 1, "points": 1}).sort("points", -1)

        async for team in cursor:
            team["_id"] = str(team["_id"])
            team["name"] = team.pop("team_name")
            if (team["points"] > 0):
                teams.append(team)

        return JSONResponse(content={"teams": teams})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching teams: {str(e)}")
