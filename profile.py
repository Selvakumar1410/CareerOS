from flask import Blueprint, request, jsonify, g
from middleware import login_required
from db import get_db_connection, get_db_cursor

profile_bp = Blueprint("profile", __name__)


# 👤 VIEW PROFILE
@profile_bp.route("/profile", methods=["GET"])
@login_required
def view_profile():
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute(
            "SELECT id, name, email, auth_provider, created_at FROM users WHERE id=%s",
            (g.user["user_id"],),
        )
        profile = cursor.fetchone()

        if profile and hasattr(profile.get("created_at"), "isoformat"):
            profile["created_at"] = profile["created_at"].isoformat()

        # Check if Gmail is connected
        cursor.execute(
            "SELECT id FROM gmail_tokens WHERE user_id=%s",
            (g.user["user_id"],),
        )
        gmail_connected = cursor.fetchone() is not None
        if profile:
            profile["gmail_connected"] = gmail_connected

        return jsonify(profile)

    finally:
        cursor.close()
        conn.close()


# ✏️ UPDATE PROFILE (NAME ONLY)
@profile_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.get_json()
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400

    if len(name) > 100:
        return jsonify({"error": "Name must be under 100 characters"}), 400

    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute(
            "UPDATE users SET name=%s WHERE id=%s",
            (name, g.user["user_id"]),
        )
        conn.commit()
        return jsonify({"message": "Profile updated successfully"})

    finally:
        cursor.close()
        conn.close()
