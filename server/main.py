from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager

from config.config import SESSION_SECRET_KEY, FRONTEND_URL
from database.DB import Database
from routes import AuthRouter, EventRouter, VolunteerRouter, AttendanceRouter, TeamRouter

''' The backend API Endpoints setup '''

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    db = Database()
    db.check_connection()
    db.connect()
    app.state.db = db
    print("Database connected successfully")
    
    yield
    
    # Shutdown: Clean up resources if needed
    print("Application shutting down")

app = FastAPI(lifespan=lifespan)

print(f"Configuring CORS middleware...")
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

# Include routers
app.include_router(AuthRouter.router, prefix="/api", tags=["Authentication"])
app.include_router(EventRouter.router, prefix="/api/events", tags=["Events"])
app.include_router(VolunteerRouter.router, prefix="/api/volunteer", tags=["Volunteers"])
app.include_router(AttendanceRouter.router, prefix="/api/volunteer", tags=["Attendance"])
app.include_router(TeamRouter.router, prefix="/api", tags=["Teams"])
