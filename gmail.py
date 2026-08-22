import os
import json
import base64
import logging
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, redirect, session, g
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from middleware import login_required
from db import get_db_connection, get_db_cursor
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, API_BASE_URL, GMAIL_SCOPES
from email_parser import is_job_related_email, clean_html
from ai.email_service import EmailService

gmail_bp = Blueprint("gmail", __name__)
logger = logging.getLogger(__name__)

# Allow HTTP for local dev (OAuth2 requires HTTPS in production)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
# Relax scope check since Google returns all previously granted scopes
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"


# ==================== OAUTH2 FLOW HELPERS ====================

def get_flow():
    """Create Google OAuth2 flow for Gmail access."""
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [f"{API_BASE_URL}/auth/gmail/callback"],
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=GMAIL_SCOPES,
        redirect_uri=f"{API_BASE_URL}/auth/gmail/callback",
    )
    return flow


def get_gmail_service(user_id):
    """Build Gmail API service using stored credentials for a user."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute(
            "SELECT access_token, refresh_token, token_expiry FROM gmail_tokens WHERE user_id=%s",
            (user_id,),
        )
        row = cursor.fetchone()

        if not row:
            return None

        creds = Credentials(
            token=row["access_token"],
            refresh_token=row["refresh_token"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=GMAIL_SCOPES,
        )

        # Refresh if expired
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Update stored tokens
            cursor.execute(
                """
                UPDATE gmail_tokens
                SET access_token=%s, token_expiry=%s, updated_at=NOW()
                WHERE user_id=%s
                """,
                (creds.token, creds.expiry, user_id),
            )
            conn.commit()

        return build("gmail", "v1", credentials=creds)

    finally:
        cursor.close()
        conn.close()


# ==================== CONNECT GMAIL ====================

@gmail_bp.route("/auth/gmail/connect", methods=["GET"])
def gmail_connect():
    """Start Gmail OAuth2 flow. Frontend redirects user here."""
    jwt_token = request.args.get("token")
    if not jwt_token:
        return jsonify({"error": "Missing JWT token"}), 400

    # Store JWT in session so we can retrieve user after callback
    session["jwt_token"] = jwt_token

    flow = get_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    session["oauth_state"] = state
    session["code_verifier"] = flow.code_verifier
    return redirect(auth_url)


@gmail_bp.route("/auth/gmail/callback", methods=["GET"])
def gmail_callback():
    """Handle OAuth2 callback from Google."""
    flow = get_flow()
    flow.code_verifier = session.get("code_verifier")
    # Fix auth_response URL scheme to match redirect_uri for Render
    auth_response_url = request.url
    if "onrender.com" in auth_response_url and auth_response_url.startswith("http://"):
        auth_response_url = auth_response_url.replace("http://", "https://", 1)

    flow.fetch_token(authorization_response=auth_response_url)

    credentials = flow.credentials

    # Decode the JWT to get user_id
    import jwt as pyjwt
    from config import JWT_SECRET

    jwt_token = session.get("jwt_token")
    if not jwt_token:
        return "<h2>Error: Session expired. Please try connecting Gmail again.</h2>", 400

    try:
        payload = pyjwt.decode(jwt_token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload["user_id"]
    except Exception:
        return "<h2>Error: Invalid token. Please log in again.</h2>", 401

    # Store tokens in DB
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        # Upsert: update if exists, insert if not
        cursor.execute("SELECT id FROM gmail_tokens WHERE user_id=%s", (user_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                """
                UPDATE gmail_tokens
                SET access_token=%s, refresh_token=%s, token_expiry=%s, updated_at=NOW()
                WHERE user_id=%s
                """,
                (credentials.token, credentials.refresh_token, credentials.expiry, user_id),
            )
        else:
            cursor.execute(
                """
                INSERT INTO gmail_tokens (user_id, access_token, refresh_token, token_expiry)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, credentials.token, credentials.refresh_token, credentials.expiry),
            )

        conn.commit()

    finally:
        cursor.close()
        conn.close()

    # Redirect back to frontend dashboard
    return """
    <html>
    <body>
        <h2>✅ Gmail Connected Successfully!</h2>
        <p>Redirecting to dashboard...</p>
        <script>
            window.opener && window.opener.postMessage("gmail_connected", "*");
            setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
        </script>
    </body>
    </html>
    """


# ==================== GMAIL STATUS ====================

@gmail_bp.route("/auth/gmail/status", methods=["GET"])
@login_required
def gmail_status():
    """Check if user has connected Gmail."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute("SELECT id, updated_at FROM gmail_tokens WHERE user_id=%s", (g.user["user_id"],))
        row = cursor.fetchone()

        if row:
            updated = row["updated_at"]
            if hasattr(updated, "isoformat"):
                updated = updated.isoformat()
                
            # Fetch last scan date
            cursor.execute("SELECT last_scan_date FROM email_scans WHERE user_id=%s ORDER BY last_scan_date DESC LIMIT 1", (g.user["user_id"],))
            scan_row = cursor.fetchone()
            last_sync = None
            if scan_row and scan_row["last_scan_date"]:
                last_sync = scan_row["last_scan_date"]
                if hasattr(last_sync, "isoformat"):
                    last_sync = last_sync.isoformat()
                    
            return jsonify({"connected": True, "last_updated": updated, "last_sync": last_sync})
        else:
            return jsonify({"connected": False})

    finally:
        cursor.close()
        conn.close()


@gmail_bp.route("/auth/gmail/disconnect", methods=["POST"])
@login_required
def gmail_disconnect():
    """Disconnect Gmail (revoke stored tokens)."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute("DELETE FROM gmail_tokens WHERE user_id=%s", (g.user["user_id"],))
        conn.commit()
        return jsonify({"message": "Gmail disconnected"})

    finally:
        cursor.close()
        conn.close()


# ==================== SCAN EMAILS ====================

@gmail_bp.route("/emails/scan", methods=["GET"])
@login_required
def scan_emails():
    """Scan user's Gmail for job application emails."""
    service = get_gmail_service(g.user["user_id"])
    if not service:
        return jsonify({"error": "Gmail not connected. Please connect Gmail first."}), 400

    days = request.args.get("days", "14")
    try:
        days = int(days)
    except ValueError:
        days = 14

    # Search for job-related emails
    query = (
        "("
        "subject:(application OR applied OR applying OR interview OR shortlisted OR offer OR rejected OR assessment) "
        "OR from:(naukri OR linkedin OR indeed OR glassdoor OR instahyre OR cutshort OR internshala OR hirist OR wellfound OR monster OR shine) "
        "OR subject:(\"thank you for applying\" OR \"application received\" OR \"application confirmation\")"
        ") "
        f"newer_than:{days}d"
    )

    try:
        results = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=150,
        ).execute()

        messages = results.get("messages", [])

        if not messages:
            return jsonify({"jobs": [], "total_scanned": 0, "message": "No job emails found"})

        extracted_jobs = []
        conn = get_db_connection()
        cursor = get_db_cursor(conn)
        new_jobs_processed = 0

        try:
            for msg_meta in messages:
                if new_jobs_processed >= 10:
                    break  # Prevent HTTP timeout by capping at 10 AI extractions per request

                msg_id = msg_meta["id"]

                # Check if already imported
                cursor.execute(
                    "SELECT id FROM job_applications WHERE user_id=%s AND email_message_id=%s",
                    (g.user["user_id"], msg_id),
                )
                if cursor.fetchone():
                    continue  # Already imported
                
                new_jobs_processed += 1

                # Fetch full message
                msg = service.users().messages().get(
                    userId="me",
                    id=msg_id,
                    format="full",
                ).execute()

                # Extract headers
                headers = {h["name"].lower(): h["value"] for h in msg["payload"].get("headers", [])}
                subject = headers.get("subject", "")
                sender = headers.get("from", "")
                date_str = headers.get("date", "")

                # Extract body
                body_html = _extract_body(msg["payload"])

                # Parse the email
                body_text = clean_html(body_html)

                if not is_job_related_email(subject, body_text, sender):
                    continue

                result = EmailService.parse_email(subject, body_text, sender, _parse_date(date_str))

                if result:
                    result["email_message_id"] = msg_id
                    result["subject"] = subject[:300]
                    result["sender"] = sender[:200]
                    company_name = result["company"]
                    role_name = result["role"]
                    new_status = result["status"]
                    
                    try:
                        # Check if we already have an application for the SAME company (case-insensitive)
                        cursor.execute(
                            """
                            SELECT id, status, company, role 
                            FROM job_applications 
                            WHERE user_id=%s AND LOWER(company) = LOWER(%s)
                            ORDER BY created_at DESC 
                            LIMIT 1
                            """,
                            (g.user["user_id"], company_name),
                        )
                        existing = cursor.fetchone()
                        
                        if existing:
                            old_status = existing["status"]
                            status_order = {"Applied": 0, "Shortlisted": 1, "Assessment": 2, "Interview": 3, "Rejected": 4, "Offer": 5}

                            # Update status if the new status is a progression
                            if (new_status != old_status and
                                    status_order.get(new_status, 0) > status_order.get(old_status, 0)):
                                if old_status not in ["Rejected", "Offer"]:
                                    cursor.execute(
                                        """
                                        UPDATE job_applications 
                                        SET status=%s, email_message_id=%s, updated_at=NOW(),
                                            interview_date=COALESCE(%s, interview_date),
                                            assessment_date=COALESCE(%s, assessment_date)
                                        WHERE id=%s AND user_id=%s
                                        """,
                                        (new_status, msg_id, result.get("interview_date"), result.get("assessment_date"), existing["id"], g.user["user_id"]),
                                    )
                                    extracted_jobs.append(result)
                            else:
                                # Just link the email message ID so we don't process it again
                                cursor.execute(
                                    "UPDATE job_applications SET email_message_id=%s WHERE id=%s AND user_id=%s",
                                    (msg_id, existing["id"], g.user["user_id"]),
                                )
                        else:
                            # Insert the parsed job directly into the DB
                            cursor.execute(
                                """
                                INSERT INTO job_applications (user_id, company, role, status, source, email_message_id, applied_date, interview_date, assessment_date)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                                RETURNING id
                                """,
                                (g.user["user_id"], company_name, role_name, new_status, result["source"], msg_id, result["applied_date"], result.get("interview_date"), result.get("assessment_date"))
                            )
                            extracted_jobs.append(result)
                    except Exception as db_err:
                        logger.error(f"Failed to insert/update job during manual scan: {db_err}")
                        conn.rollback()
                        continue

            # Log scan
            cursor.execute(
                """
                INSERT INTO email_scans (user_id, last_scan_date, emails_scanned, jobs_extracted)
                VALUES (%s, NOW(), %s, %s)
                """,
                (g.user["user_id"], len(messages), len(extracted_jobs)),
            )
            conn.commit()

        finally:
            cursor.close()
            conn.close()

        return jsonify({
            "jobs": extracted_jobs,
            "total_scanned": len(messages),
            "total_extracted": len(extracted_jobs),
        })

    except Exception as e:
        logger.error(f"Gmail scan error: {e}")
        return jsonify({"error": f"Failed to scan emails: {str(e)}"}), 500


# ==================== AUTO-SCAN (called by scheduler) ====================

def auto_scan_user(user_id):
    """Background auto-scan for a specific user. Called by APScheduler."""
    service = get_gmail_service(user_id)
    if not service:
        return

    query = (
        "("
        "subject:(application OR applied OR interview OR shortlisted OR offer OR rejected OR assessment) "
        "OR from:(naukri OR linkedin OR indeed OR glassdoor OR instahyre OR cutshort OR internshala) "
        ") "
        "newer_than:14d"
    )

    try:
        results = service.users().messages().list(
            userId="me", q=query, maxResults=150
        ).execute()

        messages = results.get("messages", [])
        if not messages:
            return

        conn = get_db_connection()
        cursor = get_db_cursor(conn)
        new_jobs = 0
        updated_jobs = 0
        notifications = []
        new_jobs_processed = 0

        try:
            for msg_meta in messages:
                if new_jobs_processed >= 10:
                    break  # Keep background jobs fast
                    
                msg_id = msg_meta["id"]

                # 1. Skip if this EXACT email message was already processed
                cursor.execute(
                    "SELECT id FROM job_applications WHERE user_id=%s AND email_message_id=%s",
                    (user_id, msg_id),
                )
                if cursor.fetchone():
                    continue
                
                new_jobs_processed += 1

                # 2. Fetch email message details
                msg = service.users().messages().get(
                    userId="me", id=msg_id, format="full"
                ).execute()

                headers = {h["name"].lower(): h["value"] for h in msg["payload"].get("headers", [])}
                subject = headers.get("subject", "")
                sender = headers.get("from", "")
                date_str = headers.get("date", "")
                body_html = _extract_body(msg["payload"])
                body_text = clean_html(body_html)

                # 3. Filter out irrelevant emails (alerts, news, digests etc)
                if not is_job_related_email(subject, body_text, sender):
                    continue

                # 4. Parse the email details with CareerAI
                result = EmailService.parse_email(subject, body_text, sender, _parse_date(date_str))
                if not result or result.get("confidence") == "low":
                    continue

                company_name = result["company"]
                role_name = result["role"]
                new_status = result["status"]

                # 5. Check if we already have an application for the SAME company (case-insensitive)
                cursor.execute(
                    """
                    SELECT id, status, company, role 
                    FROM job_applications 
                    WHERE user_id=%s AND LOWER(company) = LOWER(%s)
                    ORDER BY created_at DESC 
                    LIMIT 1
                    """,
                    (user_id, company_name),
                )
                existing = cursor.fetchone()

                if existing:
                    old_status = existing["status"]
                    status_order = {"Applied": 0, "Shortlisted": 1, "Assessment": 2, "Interview": 3, "Rejected": 4, "Offer": 5}

                    # Update status if the new status is a progression
                    if (new_status != old_status and
                            status_order.get(new_status, 0) > status_order.get(old_status, 0)):
                        if old_status not in ["Rejected", "Offer"]:
                            cursor.execute(
                                """
                                UPDATE job_applications 
                                SET status=%s, email_message_id=%s, updated_at=NOW(),
                                    interview_date=COALESCE(%s, interview_date),
                                    assessment_date=COALESCE(%s, assessment_date)
                                WHERE id=%s AND user_id=%s
                                """,
                                (new_status, msg_id, result.get("interview_date"), result.get("assessment_date"), existing["id"], user_id),
                            )
                            updated_jobs += 1
                            notifications.append({
                                "type": "status_update",
                                "company": existing["company"],
                                "role": existing["role"],
                                "old_status": old_status,
                                "new_status": new_status,
                                "message": f"🔄 {existing['company']} - {existing['role']}: {old_status} → {new_status}",
                            })
                    else:
                        # Just link the email message ID so we don't process it again
                        cursor.execute(
                            "UPDATE job_applications SET email_message_id=%s WHERE id=%s AND user_id=%s",
                            (msg_id, existing["id"], user_id),
                        )
                else:
                    # New job application: insert it
                    cursor.execute(
                        """
                        INSERT INTO job_applications
                        (user_id, company, role, location, status, applied_date, source, email_message_id, job_reference_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            user_id,
                            company_name,
                            role_name,
                            result.get("location", ""),
                            new_status,
                            result.get("applied_date"),
                            result.get("source_platform", "email"),
                            msg_id,
                            result.get("job_id"),
                        ),
                    )
                    new_jobs += 1
                    notifications.append({
                        "type": "new_job",
                        "company": company_name,
                        "role": role_name,
                        "message": f"✅ New application detected: {company_name} - {role_name}",
                    })

            conn.commit()

            # Store notifications
            for notif in notifications:
                cursor.execute(
                    """
                    INSERT INTO notifications (user_id, type, title, message, metadata)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        notif["type"],
                        f"{notif['company']} - {notif['role']}",
                        notif["message"],
                        json.dumps(notif),
                    ),
                )
            conn.commit()

            # Log scan
            cursor.execute(
                """
                INSERT INTO email_scans (user_id, last_scan_date, emails_scanned, jobs_extracted)
                VALUES (%s, NOW(), %s, %s)
                """,
                (user_id, len(messages), new_jobs),
            )
            conn.commit()

            logger.info(f"Auto-scan user {user_id}: {new_jobs} new, {updated_jobs} updated")

        finally:
            cursor.close()
            conn.close()

    except Exception as e:
        logger.error(f"Auto-scan error for user {user_id}: {e}")


def run_auto_scan_all():
    """Scan all users who have connected Gmail. Called by scheduler."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute("SELECT user_id FROM gmail_tokens")
        users = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    for user_row in users:
        try:
            auto_scan_user(user_row["user_id"])
        except Exception as e:
            logger.error(f"Auto-scan failed for user {user_row['user_id']}: {e}")


# ==================== HELPERS ====================

def _extract_body(payload):
    """Recursively extract email body (prefer HTML, fallback to plain text)."""
    body = ""

    if "parts" in payload:
        for part in payload["parts"]:
            mime = part.get("mimeType", "")
            if mime == "text/html":
                data = part.get("body", {}).get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
                    return body
            elif mime == "text/plain" and not body:
                data = part.get("body", {}).get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
            elif "parts" in part:
                nested = _extract_body(part)
                if nested:
                    return nested
    else:
        data = payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

    return body


def _parse_date(date_str):
    """Parse email date header into YYYY-MM-DD format."""
    if not date_str:
        return datetime.now().strftime("%Y-%m-%d")

    # Try common email date formats
    for fmt in [
        "%a, %d %b %Y %H:%M:%S %z",
        "%d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S",
        "%d %b %Y %H:%M:%S",
    ]:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return datetime.now().strftime("%Y-%m-%d")
