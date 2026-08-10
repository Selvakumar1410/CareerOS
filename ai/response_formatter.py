def format_chat_response(text):
    """Sanitize or format the response before sending to frontend."""
    if not text:
        return ""
    return text.strip()
