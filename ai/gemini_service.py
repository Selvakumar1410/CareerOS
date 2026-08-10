import time
from google import genai
from .config import get_gemini_api_key, DEFAULT_MODEL

class GeminiService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GeminiService, cls).__new__(cls)
            cls._instance.client = genai.Client(api_key=get_gemini_api_key())
            cls._instance.default_model = DEFAULT_MODEL
        return cls._instance

    def generate_structured(self, prompt: str, schema, context_data: dict = None, retries: int = 3):
        full_prompt = prompt
        if context_data:
            full_prompt = full_prompt.format(**context_data)
            
        for attempt in range(retries):
            try:
                response = self.client.models.generate_content(
                    model=self.default_model,
                    contents=full_prompt,
                    config={
                        'response_mime_type': 'application/json',
                        'response_schema': schema,
                    }
                )
                return response.parsed
            except Exception as e:
                error_msg = str(e)
                if '503' in error_msg and attempt < retries - 1:
                    time.sleep(2)
                    continue
                if '429' in error_msg and attempt < retries - 1:
                    time.sleep(5)
                    continue
                print(f"GeminiService JSON Generation Error: {e}")
                return None

    def generate_text(self, prompt: str, context_data: dict = None, retries: int = 3):
        full_prompt = prompt
        if context_data:
            full_prompt = full_prompt.format(**context_data)
            
        for attempt in range(retries):
            try:
                response = self.client.models.generate_content(
                    model=self.default_model,
                    contents=full_prompt
                )
                return response.text.strip()
            except Exception as e:
                error_msg = str(e)
                if '503' in error_msg and attempt < retries - 1:
                    time.sleep(2)
                    continue
                if '429' in error_msg and attempt < retries - 1:
                    time.sleep(5)
                    continue
                print(f"GeminiService Text Generation Error: {e}")
                return f"I encountered an error connecting to my neural net: {str(e)}"

# Singleton instance
gemini_client = GeminiService()
