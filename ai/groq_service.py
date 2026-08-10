import time
import json
from groq import Groq
from .config import get_groq_api_key, DEFAULT_MODEL

class GroqService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GroqService, cls).__new__(cls)
            cls._instance.client = Groq(api_key=get_groq_api_key())
            cls._instance.default_model = DEFAULT_MODEL
        return cls._instance

    def generate_structured(self, prompt: str, schema, context_data: dict = None, retries: int = 3):
        full_prompt = prompt
        if context_data:
            full_prompt = full_prompt.format(**context_data)
            
        # Append schema instructions for Groq JSON mode
        full_prompt += f"\n\nYou must return your response in JSON format exactly matching this schema: {schema.model_json_schema()}"
            
        for attempt in range(retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.default_model,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that strictly outputs JSON."},
                        {"role": "user", "content": full_prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content
                data = json.loads(content)
                return schema.model_validate(data)
                
            except Exception as e:
                error_msg = str(e)
                if '503' in error_msg and attempt < retries - 1:
                    time.sleep(2)
                    continue
                if '429' in error_msg and attempt < retries - 1:
                    time.sleep(5)
                    continue
                print(f"GroqService JSON Generation Error: {e}")
                return None

    def generate_text(self, prompt: str, context_data: dict = None, retries: int = 3):
        full_prompt = prompt
        if context_data:
            full_prompt = full_prompt.format(**context_data)
            
        for attempt in range(retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.default_model,
                    messages=[
                        {"role": "user", "content": full_prompt}
                    ]
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                error_msg = str(e)
                if '503' in error_msg and attempt < retries - 1:
                    time.sleep(2)
                    continue
                if '429' in error_msg and attempt < retries - 1:
                    time.sleep(5)
                    continue
                print(f"GroqService Text Generation Error: {e}")
                return f"I encountered an error connecting to my neural net: {str(e)}"

# Singleton instance
groq_client = GroqService()
