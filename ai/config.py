import os
from dotenv import load_dotenv

load_dotenv()

def get_groq_api_key():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in the environment variables.")
    return api_key

DEFAULT_MODEL = "llama-3.3-70b-versatile"
