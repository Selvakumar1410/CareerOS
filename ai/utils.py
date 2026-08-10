def sanitize_input(text):
    if not text:
        return ""
    return str(text).strip()
