from functools import wraps
from flask import request, jsonify, g
import jwt
from config import JWT_SECRET


def verify_token(req):
    """Extract and verify JWT from Authorization header. Returns payload or None."""
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def login_required(f):
    """Decorator that protects routes — verifies JWT and injects user into g.user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = verify_token(request)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        g.user = user
        return f(*args, **kwargs)
    return decorated
