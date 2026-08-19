import os
import sys

from db import get_db_connection

def clear():
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM daily_briefs;")
            conn.commit()
            print("Successfully cleared daily_briefs cache.")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            conn.close()
    else:
        print("Failed to connect to DB.")

if __name__ == "__main__":
    clear()
