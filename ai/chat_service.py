from .gemini_service import gemini_client
from .context_service import get_user_chat_context
from .memory_service import MemoryService
from .prompt_builder import build_chat_prompt
from .response_formatter import format_chat_response

class ChatService:
    @staticmethod
    def generate_response(user_id, user_message):
        # 1. Fetch Context
        db_context = get_user_chat_context(user_id)
        
        # 2. Fetch Chat History
        chat_history = MemoryService.format_chat_history(user_id, limit=6)
        
        # 3. Construct the full prompt
        full_prompt = build_chat_prompt(db_context, chat_history, user_message)
        
        # 4. Generate Response using Gemini
        raw_response = gemini_client.generate_text(full_prompt)
        
        # 5. Format/Sanitize
        response_text = format_chat_response(raw_response)
        
        # 6. Save to memory
        MemoryService.save_memory(user_id, 'chat_history', f"User: {user_message}")
        MemoryService.save_memory(user_id, 'chat_history', f"CareerAI: {response_text}")
        
        return response_text
