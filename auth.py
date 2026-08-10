from flask import Blueprint, request, jsonify
import jwt
import datetime
from google.oauth2 import id_token
from google.auth.transport import requests
from config import JWT_SECRET, JWT_EXP_DAYS, GOOGLE_CLIENT_ID
from db import get_db_connection, get_db_cursor

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/google", methods=["POST"])
def google_login():
    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Token missing"}), 400

    try:
        # ✅ Verify Google token
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = idinfo["email"]
        name = idinfo.get("name")
        google_id = idinfo["sub"]

    except Exception:
        return jsonify({"error": "Invalid Google token"}), 401

    # ✅ Check user in DB
    conn = get_db_connection()
    cursor = get_db_cursor(conn)

    try:
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user:
            cursor.execute(
                """
                INSERT INTO users (name, email, google_id, auth_provider)
                VALUES (%s, %s, %s, 'google')
                RETURNING id
                """,
                (name, email, google_id)
            )
            user_id = cursor.fetchone()["id"]
            conn.commit()
        else:
            user_id = user["id"]

        # ✅ Create JWT
        payload = {
            "user_id": user_id,
            "email": email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXP_DAYS)
        }

        jwt_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return jsonify({
            "message": "Login successful",
            "token": jwt_token,
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            }
        })

    finally:
        cursor.close()
        conn.close()
