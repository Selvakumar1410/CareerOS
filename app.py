import os
import logging
from flask import Flask, render_template
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import FLASK_SECRET_KEY, GMAIL_SCAN_INTERVAL_MINUTES, API_BASE_URL
from auth import auth_bp
from jobs import jobs_bp
from profile import profile_bp
from gmail import gmail_bp, run_auto_scan_all
from ai.routes import ai_bp
from notifications_api import notifications_bp
from migrate import run_migrations

# Run database migrations on startup
try:
    print("Running database migrations on startup...")
    run_migrations()
except Exception as e:
    print(f"Startup migration warning: {e}")

# ==================== LOGGING ====================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ==================== APP ====================
app = Flask(__name__, static_folder="frontend", static_url_path="", template_folder="frontend/templates")
app.secret_key = FLASK_SECRET_KEY
CORS(app, resources={r"/*": {"origins": [API_BASE_URL, "http://localhost:5000", "http://127.0.0.1:5000"]}})

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(jobs_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(gmail_bp)
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(notifications_bp)


@app.route("/")
def home():
    return render_template("index.html")

@app.route("/login")
def login():
    from config import GOOGLE_CLIENT_ID
    return render_template("login.html", google_client_id=GOOGLE_CLIENT_ID)

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/applications")
def applications():
    return render_template("applications.html")

@app.route("/pipeline")
def pipeline():
    return render_template("pipeline.html")

@app.route("/calendar")
def calendar():
    return render_template("calendar.html")

@app.route("/career-ai")
def career_ai():
    return render_template("career_ai.html")

@app.route("/analytics")
def analytics():
    return render_template("analytics.html")

@app.route("/resume-ai")
def resume_ai():
    return render_template("resume_ai.html")

@app.route("/integrations")
def integrations():
    return render_template("integrations.html")

@app.route("/notifications")
def notifications():
    return render_template("notifications.html")

@app.route("/settings")
def settings():
    return render_template("profile.html")

@app.route("/googlecd7e7f504dbd2cc0.html")
def google_verification():
    return "google-site-verification: googlecd7e7f504dbd2cc0.html"


# ==================== AUTO-SCAN SCHEDULER ====================
# Re-enabled now that we are using lightning-fast Groq API instead of Gemini
from apscheduler.schedulers.background import BackgroundScheduler
scheduler = BackgroundScheduler()
scheduler.add_job(
    func=run_auto_scan_all,
    trigger="interval",
    minutes=int(os.environ.get("GMAIL_SCAN_INTERVAL_MINUTES", "5")),
    id="gmail_auto_scan",
    name="Auto-scan Gmail for all connected users",
    replace_existing=True,
)
scheduler.start()
logger.info(f"📧 Auto-scan scheduler started (every {os.environ.get('GMAIL_SCAN_INTERVAL_MINUTES', '5')} minutes)")


# IMPORTANT for deployment
if __name__ == "__main__":
    import os
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    bind_host = os.environ.get("FLASK_HOST", "127.0.0.1")
    try:
        app.run(host=bind_host, port=5000, debug=debug_mode)
    except (KeyboardInterrupt, SystemExit):
        pass