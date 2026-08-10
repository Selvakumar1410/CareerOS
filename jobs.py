from flask import Blueprint, request, jsonify, g
from middleware import login_required
from db import get_db_connection, get_db_cursor

jobs_bp = Blueprint("jobs", __name__)


# ================= ADD JOB =================
@jobs_bp.route("/jobs", methods=["POST"])
@login_required
def add_job():
    data = request.get_json()

    # Input validation
    company = (data.get("company") or "").strip()
    role = (data.get("role") or "").strip()
    location = (data.get("location") or "").strip()
    status = data.get("status", "Applied")
    applied_date = data.get("applied_date")
    interview_date = data.get("interview_date")
    assessment_date = data.get("assessment_date")
    source = data.get("source", "manual")
    email_message_id = data.get("email_message_id")
    job_reference_id = data.get("job_reference_id")

    if not company or not role:
        return jsonify({"error": "Company and Role are required"}), 400

    if len(company) > 200 or len(role) > 200:
        return jsonify({"error": "Company and Role must be under 200 characters"}), 400

    valid_statuses = ["Applied", "Shortlisted", "Assessment", "Interview", "Rejected", "Offer"]
    if status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400

    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute(
            """
            INSERT INTO job_applications
            (user_id, company, role, location, status, applied_date, interview_date, assessment_date, source, email_message_id, job_reference_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                g.user["user_id"],
                company,
                role,
                location,
                status,
                applied_date,
                interview_date,
                assessment_date,
                source,
                email_message_id,
                job_reference_id,
            ),
        )
        job_id = cursor.fetchone()["id"]
        conn.commit()
        return jsonify({"message": "Job added", "id": job_id}), 201

    finally:
        cursor.close()
        conn.close()


# ================= GET JOBS =================
@jobs_bp.route("/jobs", methods=["GET"])
@login_required
def get_jobs():
    company = request.args.get("company")
    status = request.args.get("status")

    query = "SELECT * FROM job_applications WHERE user_id=%s"
    params = [g.user["user_id"]]

    if company:
        query += " AND company LIKE %s"
        params.append(f"%{company}%")

    if status:
        query += " AND status=%s"
        params.append(status)

    query += " ORDER BY created_at DESC"

    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute(query, tuple(params))
        jobs = cursor.fetchall()

        # Convert datetime objects to strings for JSON serialization
        for job in jobs:
            for key, val in job.items():
                if hasattr(val, "isoformat"):
                    job[key] = val.isoformat()

        return jsonify(jobs)

    finally:
        cursor.close()
        conn.close()


# ================= UPDATE JOB =================
@jobs_bp.route("/jobs/<int:job_id>", methods=["PUT"])
@login_required
def update_job(job_id):
    data = request.get_json()

    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        # Fetch existing job
        cursor.execute(
            """
            SELECT id, company, role, location, status, applied_date, interview_date, assessment_date,
                   source, created_at, updated_at
            FROM job_applications
            WHERE id=%s AND user_id=%s
            """,
            (job_id, g.user["user_id"])
        )
        job = cursor.fetchone()

        if not job:
            return jsonify({"error": "Job not found"}), 404

        # 🔒 Lock final states
        if job["status"] in ["Rejected", "Offer"]:
            return jsonify({"message": "Final status locked"}), 200

        # Preserve existing values
        company = (data.get("company") or job["company"]).strip()
        role = (data.get("role") or job["role"]).strip()
        location = (data.get("location") or job["location"] or "").strip()
        status = data.get("status", job["status"])
        applied_date = data.get("applied_date", job["applied_date"])
        interview_date = data.get("interview_date", job.get("interview_date"))
        assessment_date = data.get("assessment_date", job.get("assessment_date"))

        cursor.execute(
            """
            UPDATE job_applications
            SET company=%s,
                role=%s,
                location=%s,
                status=%s,
                applied_date=%s,
                interview_date=%s,
                assessment_date=%s
            WHERE id=%s AND user_id=%s
            """,
            (company, role, location, status, applied_date, interview_date, assessment_date, job_id, g.user["user_id"])
        )

        conn.commit()
        return jsonify({"message": "Job updated"}), 200

    finally:
        cursor.close()
        conn.close()


# ================= DELETE JOB =================
@jobs_bp.route("/jobs/<int:job_id>", methods=["DELETE"])
@login_required
def delete_job(job_id):
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute(
            "DELETE FROM job_applications WHERE id=%s AND user_id=%s",
            (job_id, g.user["user_id"])
        )
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Job not found"}), 404

        return jsonify({"message": "Job deleted"}), 200

    finally:
        cursor.close()
        conn.close()


# ================= BULK ADD (for email import) =================
@jobs_bp.route("/jobs/bulk-add", methods=["POST"])
@login_required
def bulk_add_jobs():
    data = request.get_json()
    jobs_list = data.get("jobs", [])

    if not jobs_list:
        return jsonify({"error": "No jobs provided"}), 400

    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    added = 0
    skipped = 0

    try:
        for job in jobs_list:
            company = (job.get("company") or "").strip()
            role = (job.get("role") or "").strip()
            new_status = job.get("status", "Applied")

            if not company or not role:
                skipped += 1
                continue

            email_message_id = job.get("email_message_id")
            if email_message_id:
                cursor.execute(
                    "SELECT id FROM job_applications WHERE user_id=%s AND email_message_id=%s",
                    (g.user["user_id"], email_message_id)
                )
                if cursor.fetchone():
                    skipped += 1
                    continue

            # Check if an application for the same company already exists
            cursor.execute(
                """
                SELECT id, status 
                FROM job_applications 
                WHERE user_id=%s AND LOWER(company) = LOWER(%s)
                ORDER BY created_at DESC 
                LIMIT 1
                """,
                (g.user["user_id"], company),
            )
            existing = cursor.fetchone()

            if existing:
                old_status = existing["status"]
                status_order = {"Applied": 0, "Shortlisted": 1, "Assessment": 2, "Interview": 3, "Rejected": 4, "Offer": 5}
                
                # Update status if the new status is a progression
                if (new_status != old_status and
                        status_order.get(new_status, 0) > status_order.get(old_status, 0)):
                    cursor.execute(
                        """
                        UPDATE job_applications 
                        SET status=%s, email_message_id=%s, updated_at=NOW() 
                        WHERE id=%s AND user_id=%s
                        """,
                        (new_status, email_message_id, existing["id"], g.user["user_id"]),
                    )
                    added += 1
                else:
                    # Link the message ID so we don't process it again
                    if email_message_id:
                        cursor.execute(
                            "UPDATE job_applications SET email_message_id=%s WHERE id=%s AND user_id=%s",
                            (email_message_id, existing["id"], g.user["user_id"]),
                        )
                    skipped += 1
            else:
                # Create a new application
                cursor.execute(
                    """
                    INSERT INTO job_applications
                    (user_id, company, role, location, status, applied_date, source, email_message_id, job_reference_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        g.user["user_id"],
                        company,
                        role,
                        job.get("location", ""),
                        new_status,
                        job.get("applied_date"),
                        job.get("source", "email"),
                        email_message_id,
                        job.get("job_reference_id"),
                    ),
                )
                added += 1

        conn.commit()
        return jsonify({"message": f"{added} jobs updated/added, {skipped} skipped"}), 201
    except Exception as e:
        conn.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Bulk add error: {e}")
        return jsonify({"error": "Failed to import jobs. Please try again."}), 500
    finally:
        cursor.close()
        conn.close()
