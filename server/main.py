from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from authlib.integrations.starlette_client import OAuth
# import redis
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
from cryptography.exceptions import InvalidTag
import hashlib
import base64

# Import configurations and models
from config import (
    CLIENT_ID, CLIENT_SECRET,SESSION_SECRET_KEY, ADMIN_EMAIL,REDIS_URL,
    FRONTEND_URL, MONGODB_USERNAME, MONGODB_PASSWORD, CLUSTER_NAME,
    DATABASE_NAME, APP_NAME, DEADLINE_DATE, SECRET_KEY
)
from models import User, Event, Volunteer

''' The backend API Endpoints setup '''

app = FastAPI()

# --- CORS Configuration ---
print(f"Configuring CORS middleware first...")
print(f"FRONTEND_URL from config = {FRONTEND_URL}")
allowed_origins = [FRONTEND_URL]
if FRONTEND_URL != "http://localhost:5173":
    allowed_origins.append("http://localhost:5173")
print(f"Final allowed origins: {allowed_origins}")

# CORS middleware MUST be the first middleware
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
    max_age=3600,  # Session expires after 1 hour
    same_site="none", 
    https_only=True
)

# --- MongoDB Connection ---
try:
    # Debug: Print the connection details (without password)
    print(f"Attempting MongoDB connection...")
    print(f"Cluster Name: {CLUSTER_NAME}")
    print(f"Database Name: {DATABASE_NAME}")
    print(f"App Name: {APP_NAME}")
    print(f"Username: {MONGODB_USERNAME}")
    
    MONGO_URI = f"mongodb+srv://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@{CLUSTER_NAME}.mongodb.net/?retryWrites=true&w=majority&appName={APP_NAME}"
    
    # Test DNS resolution with multiple approaches
    import socket
    hostname = f"{CLUSTER_NAME}.mongodb.net"
    
    print(f"Testing DNS resolution for: {hostname}")
    
    # Try different DNS resolution methods
    dns_success = False
    
    try:
        # Method 1: Standard DNS lookup
        ip = socket.gethostbyname(hostname)
        print(f"✅ Standard DNS resolution successful: {hostname} -> {ip}")
        dns_success = True
    except socket.gaierror as dns_error:
        print(f"❌ Standard DNS resolution failed: {dns_error}")
        
        # Method 2: Try with timeout
        try:
            socket.setdefaulttimeout(10)
            ip = socket.gethostbyname(hostname)
            print(f"✅ DNS resolution with timeout successful: {hostname} -> {ip}")
            dns_success = True
        except socket.gaierror as dns_error2:
            print(f"❌ DNS resolution with timeout also failed: {dns_error2}")
    
    if not dns_success:
        print("\n🚨 DNS RESOLUTION TROUBLESHOOTING:")
        print("1. Check if you're behind a corporate firewall/proxy")
        print("2. Try using a different DNS server (8.8.8.8 or 1.1.1.1)")
        print("3. Check if MongoDB Atlas is accessible from your network")
        print("4. Verify the cluster name in MongoDB Atlas dashboard")
        print("\n⚠️  Continuing without DNS verification - connection may still work...")
        # Don't raise exception - let MongoDB driver handle it
    
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


# --- Request Models ---
class EventCreate(BaseModel):
    event_name: str
    points: int
    secret_code:str

class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    secret_code:str
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

# --- Helper Functions ---
ENCRYPTION_KEY = hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()
IV_SIZE_BYTES = 12  # Standard nonce size for AES-GCM

# --- Encryption Function ---
def encrypt_secret_code(plain_text: str) -> str:
    """Encrypts text using AES-256-GCM with a random IV."""
    if not plain_text:
        return ""
    try:
        aesgcm = AESGCM(ENCRYPTION_KEY)
        
        # 2. Generate a new, random IV (nonce)
        iv = os.urandom(IV_SIZE_BYTES)
        
        # 3. Encrypt the data
        ciphertext_with_tag = aesgcm.encrypt(iv, plain_text.encode("utf-8"), None)
        
        # 4. Prepend the IV to the ciphertext for storage/transmission
        combined = iv + ciphertext_with_tag
        
        # 5. Return as URL-safe Base64, without padding
        return base64.urlsafe_b64encode(combined).decode("utf-8").rstrip('=')
        
    except Exception as e:
        print(f"Encryption error: {e}")
        raise e

# --- Decryption Function ---
def decrypt_secret_code(encrypted_text: str) -> str:
    """Decrypts AES-256-GCM text."""
    if not encrypted_text:
        return ""
    try:
        aesgcm = AESGCM(ENCRYPTION_KEY)
        
        # 1. Add back padding (if stripped) and decode from URL-safe Base64
        padding = len(encrypted_text) % 4
        if padding:
            encrypted_text += '=' * (4 - padding)
        
        combined = base64.urlsafe_b64decode(encrypted_text.encode("utf-8"))
        
        # 2. Extract the IV and the ciphertext
        iv = combined[:IV_SIZE_BYTES]
        ciphertext_with_tag = combined[IV_SIZE_BYTES:]
        
        # 3. Decrypt and verify the authentication tag
        # This will raise InvalidTag if the key is wrong or data is tampered
        plaintext = aesgcm.decrypt(iv, ciphertext_with_tag, None)
        
        return plaintext.decode("utf-8")
        
    except (InvalidTag, ValueError, Exception) as e:
        print(f"Decryption failed. Wrong key, tampered data, or corrupt payload: {e}")
        return ""  # Fail safely

def serialize_datetime_fields(obj):
    """Convert datetime objects in a dictionary to ISO format strings"""
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_datetime_fields(value)
            elif isinstance(value, list):
                result[key] = [serialize_datetime_fields(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        return result
    return obj

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 180

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
        return payload  # {sub: email, event_id: ...}
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

# --- OAuth Client Setup ---
oauth = OAuth()
oauth.register(
    name='microsoft',
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    server_metadata_url='https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile User.Read',
        'verify_iss': False  # Disable issuer validation to handle multi-tenant
    }
)


# --- Authentication Routes ---

@app.get('/auth/login')
async def login(request: Request):
    redirect_uri = request.url_for('auth')
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)

# @app.get('/api/auth')
# async def auth(request: Request):
#     try:
#         code = request.query_params.get('code')
#         if not code:
#             return JSONResponse(status_code=400, content={"error": "No authorization code received"})
        
#         token_url = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"
        
#         async with httpx.AsyncClient() as client:
#             token_response = await client.post(
#                 token_url,
#                 data={
#                     'client_id': CLIENT_ID,
#                     'client_secret': CLIENT_SECRET,
#                     'code': code,
#                     'grant_type': 'authorization_code',
#                     'redirect_uri': str(request.url_for('auth')),
#                     'scope': 'openid email profile User.Read'
#                 },
#                 headers={'Content-Type': 'application/x-www-form-urlencoded'}
#             )
            
#             if token_response.status_code != 200:
#                 print(f"Token exchange failed: {token_response.text}")
#                 return JSONResponse(status_code=401, content={
#                     "error": "Token exchange failed", 
#                     "details": token_response.text
#                 })
            
#             token_data = token_response.json()
#             access_token = token_data.get('access_token')
            
#             if not access_token:
#                 return JSONResponse(status_code=401, content={
#                     "error": "No access token received", 
#                     "details": str(token_data)
#                 })
            
#             # Get user info from Microsoft Graph API
#             async with httpx.AsyncClient() as client:
#                 user_response = await client.get(
#                     'https://graph.microsoft.com/v1.0/me',
#                     headers={'Authorization': f'Bearer {access_token}'}
#                 )
                
#                 if user_response.status_code != 200:
#                     return JSONResponse(status_code=401, content={
#                         "error": "Failed to get user info", 
#                         "details": user_response.text
#                     })
                
#                 user_data = user_response.json()
            
#             # Process user data
#             email = user_data.get("mail") or user_data.get("userPrincipalName")

#             if not email or not email.endswith('@iiitb.ac.in'):
#                 return JSONResponse(
#                     status_code=403,
#                     content={"error": "Access Denied: Only users with an 'iiitb.ac.in' email can log in."}
#                 )
            
#             name = user_data.get("displayName")
#             roll_number = user_data.get("employeeId", "N/A")

#             role = "participant"
#             if email.lower() == ADMIN_EMAIL.lower():
#                 role = "admin"
#             else:
#                 try:
#                     is_volunteer = await volunteer_collection.find_one({"email": email.lower()})
#                     if is_volunteer:
#                         role = "volunteer"
#                 except Exception as db_e:
#                     print(f"Database error when checking volunteer status: {db_e}")
#                     # Continue with default role if DB is unavailable
                    
#             # --- Create final user object and store in session ---
#             processed_user = {
#                 "name": name,
#                 "email": email,
#                 "rollNumber": roll_number,
#                 "role": role
#             }
#             request.session['user'] = processed_user

#             return RedirectResponse(url=f"{FRONTEND_URL}/{processed_user['role']}")
                
#     except Exception as e:
#         print(f"OAuth error details: {e}")
#         return JSONResponse(status_code=401, content={
#             "error": "Authorization failed", 
#             "details": str(e),
#             "error_type": type(e).__name__
#         })
# @app.get('/api/auth')
# async def auth(request: Request):
#     try:
#         # Initialize session if it doesn't exist
#         if not hasattr(request, 'session') or request.session is None:
#             request.session = {}
        
#         code = request.query_params.get('code')
#         if not code:
#             return JSONResponse(status_code=400, content={"error": "No authorization code received"})
        
#         token_url = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"
        
#         async with httpx.AsyncClient() as client:
#             token_response = await client.post(
#                 token_url,
#                 data={
#                     'client_id': CLIENT_ID,
#                     'client_secret': CLIENT_SECRET,
#                     'code': code,
#                     'grant_type': 'authorization_code',
#                     'redirect_uri': str(request.url_for('auth')),
#                     'scope': 'openid email profile User.Read'
#                 },
#                 headers={'Content-Type': 'application/x-www-form-urlencoded'}
#             )
            
#             if token_response.status_code != 200:
#                 print(f"Token exchange failed: {token_response.text}")
#                 return JSONResponse(status_code=401, content={
#                     "error": "Token exchange failed", 
#                     "details": token_response.text
#                 })
            
#             token_data = token_response.json()
#             access_token = token_data.get('access_token')
            
#             if not access_token:
#                 return JSONResponse(status_code=401, content={
#                     "error": "No access token received", 
#                     "details": str(token_data)
#                 })
            
#             # Get user info from Microsoft Graph API
#             user_response = await client.get(
#                 'https://graph.microsoft.com/v1.0/me',
#                 headers={'Authorization': f'Bearer {access_token}'}
#             )
            
#             if user_response.status_code != 200:
#                 return JSONResponse(status_code=401, content={
#                     "error": "Failed to get user info", 
#                     "details": user_response.text
#                 })
            
#             user_data = user_response.json()
        
#         # Process user data
#         email = user_data.get("mail") or user_data.get("userPrincipalName")

#         if not email or not email.endswith('@iiitb.ac.in'):
#             return JSONResponse(
#                 status_code=403,
#                 content={"error": "Access Denied: Only users with an 'iiitb.ac.in' email can log in."}
#             )
        
#         name = user_data.get("displayName")
#         roll_number = user_data.get("employeeId", "N/A")

#         role = "participant"
#         if email.lower() == ADMIN_EMAIL.lower():
#             role = "admin"
#         else:
#             try:
#                 is_volunteer = await volunteer_collection.find_one({"email": email.lower()})
#                 if is_volunteer:
#                     role = "volunteer"
#             except Exception as db_e:
#                 print(f"Database error when checking volunteer status: {db_e}")
#                 # Continue with default role if DB is unavailable
                
#         # Create final user object and store in session
#         processed_user = {
#             "name": name,
#             "email": email,
#             "rollNumber": roll_number,
#             "role": role
#         }
        
#         # Clear any existing session data and set new user
#         request.session.clear()
#         request.session['user'] = processed_user

#         return RedirectResponse(url=f"{FRONTEND_URL}/{processed_user['role']}")
            
#     except Exception as e:
#         print(f"OAuth error details: {e}")
#         import traceback
#         traceback.print_exc()
#         return JSONResponse(status_code=401, content={
#             "error": "Authorization failed", 
#             "details": str(e),
#             "error_type": type(e).__name__
        #})
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

        # Redirect to frontend; SessionMiddleware will set the signed cookie on the response
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
            "error_type": type(e).__name__ })

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

@app.get('/auth/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url=FRONTEND_URL or "/")


# --- Event Management Endpoints ---

@app.post('/api/events')
async def create_event(request: Request, event_data: EventCreate, admin_user: dict = Depends(require_admin)):
    """Create a new event (Admin only)"""
    try:
        event_id = str(uuid.uuid4())
        
        # Decrypt received secret_code before storing
        decrypted_secret = decrypt_secret_code(event_data.secret_code)
        
        event = {
            "event_id": event_id,
            "event_name": event_data.event_name,
            "points": event_data.points,
            "secret_code": decrypted_secret,  # Store plain text in DB
            "expired": False,
            "participants": 0,
        }
        
        result = await event_collection.insert_one(event)
        if result.inserted_id:
            event["_id"] = str(result.inserted_id)
            event = serialize_datetime_fields(event)
            # Encrypt secret_code before sending
            event["secret_code"] = encrypt_secret_code(event["secret_code"])
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
            # Encrypt secret_code before sending
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
            # Decrypt received secret_code before storing
            update_data["secret_code"] = decrypt_secret_code(event_data.secret_code)
        
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
        
        # Get updated event
        updated_event = await event_collection.find_one({"event_id": event_id})
        if updated_event:
            updated_event["_id"] = str(updated_event["_id"])
            updated_event = serialize_datetime_fields(updated_event)
            # Encrypt secret_code before sending
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


# --- Volunteer Management Endpoints ---

@app.post('/api/volunteers')
async def add_volunteer(volunteer_data: VolunteerCreate, request: Request, admin_user: dict = Depends(require_admin)):
    """Add a new volunteer (Admin only)"""
    try:
        # Check if volunteer already exists
        existing_volunteer = await volunteer_collection.find_one({"rollNumber": volunteer_data.rollNumber})
        if existing_volunteer:
            raise HTTPException(status_code=400, detail="Volunteer with this roll number already exists")
        
        volunteer = {
            "rollNumber": volunteer_data.rollNumber,
            "name": volunteer_data.name,
            "email": volunteer_data.email.lower(),
        }
        
        result = await volunteer_collection.insert_one(volunteer)
        if result.inserted_id:
            volunteer["_id"] = str(result.inserted_id)
            # Serialize datetime fields
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
            # Convert ObjectId to string
            volunteer["_id"] = str(volunteer["_id"])
            # Serialize datetime fields
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

# --- Mark Attendance Features ---

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
    email = user["email"]  # coming from Redis session (require_admin_or_volunteer)
    role = user["role"]

    event = await event_collection.find_one({"event_id": data.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if data.secret_code != event.get("secret_code"):
        raise HTTPException(status_code=401, detail="Invalid secret code")
    
    # ✅ Generate token for this volunteer
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

    # Verify event exists
    event = await event_collection.find_one({"event_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event_name = event["event_name"]
    team = await teams_collection.find_one({"qr_id": data.team_id})

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if event.get("expired"):
        raise HTTPException(status_code=400, detail="Event expired")

    if event_id in team.get("events_participated", []):
        raise HTTPException(status_code=400, detail="Team already participated in this event")

    # Update team’s points and participation
    new_points = team.get("points", 0) + event.get("points", 0)
    teams_collection.update_one(
        {"qr_id": data.team_id},
        {"$set": {"points": new_points}, "$push": {"events_participated": event_id}}
    )

    # Increment event’s participant count
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

# --- Participant Management ---
@app.post('/api/leave_team')
async def leave_team(payload: TeamAction, request: Request, user: dict = Depends(get_current_user)):
    """Remove the requesting user from the team if before DEADLINE_DATE."""
    if teams_collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        # Deadline check
        if DEADLINE_DATE:
            try:
                # Try ISO parsing first
                deadline_dt = datetime.fromisoformat(DEADLINE_DATE)
            except Exception:
                # Fallback: try date-only parsing
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
        
        if updated_team and len(updated_team.get("members", [])) == 0:
            await teams_collection.delete_one({"team_id": payload.team_id})
            return JSONResponse(status_code=200, content={"success": True, "message": "Left team successfully. Team deleted as no members remain.", "team": None})
        
        if updated_team and "_id" in updated_team:
            updated_team["_id"] = str(updated_team["_id"])
        updated_team = serialize_datetime_fields(updated_team) if updated_team else updated_team

        return JSONResponse(status_code=200, content={"success": True, "message": "Left team successfully.", "team": updated_team})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leaving team: {str(e)}")

# Add these imports at the top of main.py
import hashlib
import base64

# Add these helper functions after the existing helper functions

def generate_team_qr_id(team_id: str) -> str:
    """Generate a unique, short hashed ID for team QR code"""
    hash_object = hashlib.sha256(team_id.encode())
    hash_bytes = hash_object.digest()
    # Take first 12 bytes and encode as base64 for a shorter string
    short_hash = base64.urlsafe_b64encode(hash_bytes[:12]).decode('utf-8').rstrip('=')
    return short_hash

def generate_team_join_code(team_id: str, team_name: str) -> str:
    """Generate a short join code for team invitation"""
    combined = f"{team_id}-{team_name}"
    hash_object = hashlib.sha256(combined.encode())
    hash_bytes = hash_object.digest()
    # Take first 6 bytes for a shorter code
    short_code = base64.urlsafe_b64encode(hash_bytes[:6]).decode('utf-8').rstrip('=')
    return short_code

# Add these new endpoints before the leaderboard endpoint

# Add this to your main.py - Replace the create_team endpoint

@app.post('/api/create_team')
async def create_team(payload: TeamCreate, request: Request, user: dict = Depends(get_current_user)):
    """Create a new team with the requesting user as the only member."""
    if teams_collection is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        # Deadline check: cannot create a team after DEADLINE_DATE
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

        # Ensure team_name uniqueness if provided
        team_name = payload.team_name
        if team_name:
            existing_name = await teams_collection.find_one({"team_name": team_name})
            if existing_name:
                return JSONResponse(status_code=400, content={"success": False, "message": "Team name already taken. Choose a different name."})

        # Prevent user from creating a team if already in another team
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

        # Generate QR ID and join code
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


# Also update the /api/my_team endpoint to ensure it always returns qr_id and join_code
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
        
        # Convert ObjectId and serialize
        if "_id" in team:
            team["_id"] = str(team["_id"])
        team = serialize_datetime_fields(team)
        
        # Generate QR code ID and join code if not present
        if not team.get("qr_id"):
            team["qr_id"] = generate_team_qr_id(team["team_id"])
        if not team.get("join_code"):
            team["join_code"] = generate_team_join_code(team["team_id"], team["team_name"])
        
        # Update the database with qr_id and join_code if they were missing
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


# Also update join_team_by_code to ensure consistency
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
        
        # Deadline check
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
        
        # Find team by join_code stored in database
        matching_team = await teams_collection.find_one({"join_code": join_code})
        
        # If not found by stored join_code, try generating and matching (for backward compatibility)
        if not matching_team:
            teams_cursor = teams_collection.find()
            async for team in teams_cursor:
                team_join_code = generate_team_join_code(team["team_id"], team["team_name"])
                if team_join_code == join_code:
                    matching_team = team
                    # Update the team with the join_code for future lookups
                    await teams_collection.update_one(
                        {"team_id": team["team_id"]},
                        {"$set": {"join_code": join_code}}
                    )
                    break
        
        if not matching_team:
            return JSONResponse(status_code=404, content={"success": False, "message": "Invalid join code"})
        
        # Check team size limit (max 3 members)
        if len(matching_team.get("members", [])) >= 3:
            return JSONResponse(status_code=400, content={"success": False, "message": "Team is full (maximum 3 members)"})
        
        # Check if user already in a team
        email = user.get("email")
        if email:
            existing_team = await teams_collection.find_one({"members.email": email})
            if existing_team:
                if existing_team.get("team_id") == matching_team["team_id"]:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Already a member of this team"})
                else:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Already belongs to another team"})
        
        # Add member to team
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
        
        # Get updated team
        updated_team = await teams_collection.find_one({"team_id": matching_team["team_id"]})
        if updated_team and "_id" in updated_team:
            updated_team["_id"] = str(updated_team["_id"])
        updated_team = serialize_datetime_fields(updated_team) if updated_team else updated_team
        
        # Ensure QR and join code are present
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
    """Return top 10 teams with points > 0, sorted by points descending."""
    if teams_collection is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection not available. Please check MongoDB configuration."
        )
    try:
        teams = []
        # Filter teams with points > 0, sort by points descending, limit to 10
        cursor = teams_collection.find(
            {"points": {"$gt": 0}}, 
            {"_id": 1, "team_name": 1, "points": 1}
        ).sort("points", -1).limit(10)
        
        async for team in cursor:
            team["_id"] = str(team["_id"])
            team["name"] = team.pop("team_name")
            teams.append(team)
        
        return JSONResponse(content={"teams": teams})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching teams: {str(e)}")





