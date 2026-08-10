import os
from dotenv import load_dotenv

load_dotenv()

def get_gemini_api_key():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in the environment variables.")
    return api_key

DEFAULT_MODEL = "gemini-2.0-flash"
