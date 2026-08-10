"""
notifications_api.py
Provides REST endpoints for the MVP notifications system.
"""
from flask import Blueprint, jsonify, g
from middleware import login_required
from db import get_db_connection, get_db_cursor

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/api/notifications", methods=["GET"])
@login_required
def get_notifications():
    """Return all notifications for the current user, newest first."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    try:
        cursor.execute(
            """
            SELECT id, type, title, message, is_read, created_at
            FROM notifications
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (g.user["user_id"],),
        )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "id":         r["id"],
                "type":       r["type"],
                "title":      r["title"],
                "message":    r["message"],
                "is_read":    r["is_read"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route("/api/notifications/unread-count", methods=["GET"])
@login_required
def get_unread_count():
    """Return count of unread notifications for the current user."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=%s AND is_read=FALSE",
            (g.user["user_id"],),
        )
        row = cursor.fetchone()
        return jsonify({"count": row["cnt"] if row else 0})
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route("/api/notifications/<int:notif_id>/read", methods=["POST"])
@login_required
def mark_read(notif_id):
    """Mark a single notification as read."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    try:
        cursor.execute(
            "UPDATE notifications SET is_read=TRUE WHERE id=%s AND user_id=%s",
            (notif_id, g.user["user_id"]),
        )
        conn.commit()
        return jsonify({"success": True})
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route("/api/notifications/read-all", methods=["POST"])
@login_required
def mark_all_read():
    """Mark all notifications as read for the current user."""
    conn = get_db_connection()
    cursor = get_db_cursor(conn)
    try:
        cursor.execute(
            "UPDATE notifications SET is_read=TRUE WHERE user_id=%s",
            (g.user["user_id"],),
        )
        conn.commit()
        return jsonify({"success": True})
    finally:
        cursor.close()
        conn.close()
