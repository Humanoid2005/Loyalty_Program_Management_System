from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from datetime import datetime
import httpx

from config.config import CLIENT_ID, CLIENT_SECRET, ADMIN_EMAIL, FRONTEND_URL
from database.DB import get_db
from .dependencies import get_current_user, require_admin, require_admin_or_volunteer

router = APIRouter()

# OAuth configuration
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


@router.get('/login')
async def login(request: Request):
    redirect_uri = request.url_for('auth')
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)


@router.get('/auth')
async def auth(request: Request, db = Depends(get_db)):
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
                is_volunteer = await db.find_one("volunteers", {"email": email.lower()})
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


@router.get('/health')
async def health_check():
    """Simple health check endpoint"""
    return JSONResponse(content={"status": "healthy", "message": "Server is running"})


@router.get('/debug/session')
async def debug_session(request: Request):
    """Debug endpoint to inspect request data during CORS/cookie debugging"""
    allowed_origins = [FRONTEND_URL]
    if FRONTEND_URL != "http://localhost:5173":
        allowed_origins.append("http://localhost:5173")

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


@router.get('/user/profile')
async def user_profile(request: Request):
    user = request.session.get('user')
    if user:
        return JSONResponse(content=user)
    return JSONResponse(status_code=401, content={"error": "User not authenticated"})


@router.get('/logout')
async def logout(request: Request):
    request.session.pop('user', None)
    return RedirectResponse(url=FRONTEND_URL or "/")