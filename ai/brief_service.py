import datetime
import json
from .groq_service import groq_client
from .context_service import get_user_brief_context
from .prompt_builder import DAILY_BRIEF_PROMPT
from db import get_db_connection
from pydantic import BaseModel, Field
from typing import List

class DailyBrief(BaseModel):
    greeting: str = Field(description="A personalized, encouraging morning greeting.")
    summary: str = Field(description="A 2-3 sentence overview of the current job pipeline state.")
    urgent_actions: List[str] = Field(description="A list of 1-3 urgent action items (like preparing for interviews).")
    insights: str = Field(description="One interesting tip or data insight based on their application velocity.")

class BriefService:
    @staticmethod
    def generate_brief(user_id):
        today = datetime.date.today()
        
        conn = get_db_connection()
        if not conn: return None
        
        # try:
        #     with conn.cursor() as cursor:
        #         cursor.execute("""
        #             SELECT brief_content FROM daily_briefs 
        #             WHERE user_id = %s AND brief_date = %s
        #         """, (user_id, today))
        #         cached = cursor.fetchone()
        #         if cached:
        #             return cached[0] if isinstance(cached, tuple) else cached['brief_content']
        # except Exception as e:
        #     print(f"Error checking cache: {e}")
        # finally:
        #     pass # conn.close()

        context_str = get_user_brief_context(user_id, today)
        if not context_str: return {"error": "Failed to fetch DB context"}
        
        brief_model = groq_client.generate_structured(
            DAILY_BRIEF_PROMPT, 
            schema=DailyBrief, 
            context_data={"context": context_str}
        )
        
        if not brief_model:
            return {"error": "Failed to generate structured brief."}
            
        brief_json = brief_model.model_dump()

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO daily_briefs (user_id, brief_date, brief_content) 
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id, brief_date) DO UPDATE 
                    SET brief_content = EXCLUDED.brief_content
                """, (user_id, today, json.dumps(brief_json)))
            conn.commit()
        except Exception as e:
            print(f"Error saving daily brief: {e}")
        finally:
            conn.close()

        return brief_json
