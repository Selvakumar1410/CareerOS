import psycopg2.extras
from db import get_db_connection

class MemoryService:
    @staticmethod
    def save_memory(user_id, memory_type, content):
        """Save a new piece of memory to the database."""
        conn = get_db_connection()
        if not conn: return False
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO ai_memory (user_id, memory_type, content)
                    VALUES (%s, %s, %s)
                """, (user_id, memory_type, content))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error saving memory: {e}")
            return False
        finally:
            conn.close()

    @staticmethod
    def get_memories(user_id, memory_type=None, limit=10):
        """Retrieve memories for a user."""
        conn = get_db_connection()
        if not conn: return []
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                if memory_type:
                    cursor.execute("""
                        SELECT content, created_at FROM ai_memory 
                        WHERE user_id = %s AND memory_type = %s 
                        ORDER BY created_at DESC LIMIT %s
                    """, (user_id, memory_type, limit))
                else:
                    cursor.execute("""
                        SELECT memory_type, content, created_at FROM ai_memory 
                        WHERE user_id = %s 
                        ORDER BY created_at DESC LIMIT %s
                    """, (user_id, limit))
                return cursor.fetchall()
        except Exception as e:
            print(f"Error retrieving memory: {e}")
            return []
        finally:
            conn.close()

    @staticmethod
    def format_chat_history(user_id, limit=5):
        """Format past chat history into a string for LLM context."""
        memories = MemoryService.get_memories(user_id, memory_type='chat_history', limit=limit)
        if not memories:
            return "No previous chat history."
        
        memories.reverse()
        formatted = ""
        for m in memories:
            formatted += f"{m['content']}\n"
        return formatted
