import os
from dotenv import load_dotenv

load_dotenv()

# ==================== JWT ====================
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_EXP_DAYS = int(os.environ.get("JWT_EXP_DAYS", "7"))

if not JWT_SECRET:
    raise RuntimeError("❌ JWT_SECRET environment variable is required. Set it in .env")

# ==================== GOOGLE OAUTH ====================
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

if not GOOGLE_CLIENT_ID:
    raise RuntimeError("❌ GOOGLE_CLIENT_ID environment variable is required. Set it in .env")

# ==================== DATABASE ====================
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "job_tracker_db")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))

if not os.environ.get("DATABASE_URL") and not os.environ.get("MYSQL_URL"):
    if not os.environ.get("DB_PASSWORD"):
        print("⚠️ SECURITY WARNING: DB_PASSWORD is not set in environment. Using empty password fallback, which is unsafe for production.")

# ==================== APP ====================
FLASK_SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", JWT_SECRET)
API_BASE_URL = os.environ.get("RENDER_EXTERNAL_URL", os.environ.get("API_BASE_URL", "http://localhost:5000"))

# ==================== GMAIL SCAN ====================
GMAIL_SCAN_INTERVAL_MINUTES = int(os.environ.get("GMAIL_SCAN_INTERVAL_MINUTES", "5"))

# ==================== SCOPES ====================
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
