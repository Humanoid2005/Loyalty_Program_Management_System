from starlette.config import Config

config = Config(".env")

CLIENT_ID = config("CLIENT_ID")
CLIENT_SECRET = config("CLIENT_SECRET")
TENANT_ID = config("TENANT_ID")
SESSION_SECRET_KEY= config("SESSION_SECRET_KEY")

ADMIN_EMAIL = config("ADMIN_EMAIL", default="synergy@iiitb.ac.in")
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")
BACKEND_URL = config("BACKEND_URL", default="http://localhost:8000")

MONGODB_USERNAME = config("MONGODB_USERNAME")
MONGODB_PASSWORD = config("MONGODB_PASSWORD")
CLUSTER_NAME = config("CLUSTER_NAME")
DATABASE_NAME = config("DATABASE_NAME")
APP_NAME = config("APP_NAME")
DEADLINE_DATE = config("DEADLINE_DATE", default=None)

SECRET_KEY = config("SECRET_KEY")