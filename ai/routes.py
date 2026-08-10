from flask import Blueprint, request, jsonify, g
from middleware import login_required
from .chat_service import ChatService
from .brief_service import BriefService

ai_bp = Blueprint('ai_bp', __name__)

@ai_bp.route('/health', methods=['GET'])
def ai_health():
    return jsonify({"status": "healthy", "module": "ai_v2"}), 200

@ai_bp.route('/chat', methods=['POST'])
@login_required
def ai_chat():
    user = g.user
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    message = data.get('message')
    if not message:
        return jsonify({"error": "Message is required."}), 400
        
    try:
        response_text = ChatService.generate_response(user['user_id'], message)
        return jsonify({"response": response_text})
    except Exception as e:
        print(f"Chat API Error: {e}")
        return jsonify({"error": "Failed to process chat"}), 500

@ai_bp.route('/daily-brief', methods=['POST'])
@login_required
def daily_brief():
    user = g.user
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        brief = BriefService.generate_brief(user['user_id'])
        if not brief or "error" in brief:
            return jsonify({"error": brief.get("error", "Unknown error") if brief else "Unknown error"}), 500
        return jsonify({"brief": brief})
    except Exception as e:
        print(f"Brief API Error: {e}")
        return jsonify({"error": "Failed to process brief"}), 500
