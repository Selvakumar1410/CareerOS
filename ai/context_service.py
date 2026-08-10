import psycopg2.extras
from db import get_db_connection

def get_user_chat_context(user_id):
    """Fetches the user's active job pipeline to provide real-time context to the LLM."""
    conn = get_db_connection()
    if not conn: return "No database connection."
    
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("""
                SELECT company, role, status, applied_date 
                FROM job_applications 
                WHERE user_id = %s AND status NOT IN ('Rejected')
                ORDER BY applied_date DESC LIMIT 20
            """, (user_id,))
            jobs = cursor.fetchall()
            
            if not jobs:
                return "The user has no active job applications currently tracked."
                
            context = "User's Active Job Pipeline:\n"
            for j in jobs:
                date_str = j['applied_date'].strftime('%Y-%m-%d') if j['applied_date'] else 'Unknown'
                context += f"- {j['company']} ({j['role']}): {j['status']} (Applied: {date_str})\n"
            return context
    except Exception as e:
        print(f"Error fetching context: {e}")
        return "Error retrieving user context."
    finally:
        conn.close()

def get_user_brief_context(user_id, today):
    conn = get_db_connection()
    if not conn: return None
    
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            # Stats
            cursor.execute("""
                SELECT status, count(*) as count 
                FROM job_applications 
                WHERE user_id = %s 
                GROUP BY status
            """, (user_id,))
            stats = cursor.fetchall()
            
            # Urgent
            cursor.execute("""
                SELECT company, role, status, applied_date 
                FROM job_applications 
                WHERE user_id = %s AND status IN ('Assessment', 'Interview')
            """, (user_id,))
            urgent = cursor.fetchall()
            
        context_str = f"Pipeline Stats: {stats}\nUrgent/Active Pipeline: {urgent}\nToday's Date: {today}"
        return context_str
    except Exception as e:
        print(f"Error fetching DB context for brief: {e}")
        return None
    finally:
        conn.close()
