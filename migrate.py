import os
from urllib.parse import urlparse
import psycopg2
from dotenv import load_dotenv

# Load env vars
load_dotenv()

def get_connection():
    database_url = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")
    if database_url:
        parsed = urlparse(database_url)
        config = {
            "host": parsed.hostname,
            "user": parsed.username,
            "password": parsed.password,
            "database": parsed.path.lstrip("/"),
            "port": parsed.port or 5432,
        }
    else:
        config = {
            "host": os.environ.get("DB_HOST", "localhost"),
            "user": os.environ.get("DB_USER", "postgres"),
            "password": os.environ.get("DB_PASSWORD", ""),
            "database": os.environ.get("DB_NAME", "job_tracker_db"),
            "port": int(os.environ.get("DB_PORT", 5432)),
        }
    print(f"Connecting to PostgreSQL database: {config.get('host')}:{config.get('port')} (db: {config.get('database')})")
    return psycopg2.connect(**config)

def run_migrations():
    try:
        conn = get_connection()
        cursor = conn.cursor()
    except Exception as e:
        print(f"Connection failed: {e}")
        print("\nTip: Make sure your PostgreSQL server is running and that credentials in .env are correct.")
        return

    try:
        # Create users table
        print("Migrating: Creating 'users' table if not exists...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(255) UNIQUE NOT NULL,
            google_id VARCHAR(255),
            auth_provider VARCHAR(50) DEFAULT 'google',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Create job_applications table
        print("Migrating: Creating 'job_applications' table if not exists...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS job_applications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            company VARCHAR(200) NOT NULL,
            role VARCHAR(200) NOT NULL,
            location VARCHAR(200),
            status VARCHAR(50) DEFAULT 'Applied' CHECK (status IN ('Applied', 'Shortlisted', 'Assessment', 'Interview', 'Rejected', 'Offer', 'Ignored')),
            applied_date DATE,
            interview_date TIMESTAMP,
            assessment_date TIMESTAMP,
            source VARCHAR(50) DEFAULT 'manual',
            email_message_id VARCHAR(255),
            job_reference_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)

        # Add missing columns to job_applications if table was created older
        print("Migrating: Checking 'job_applications' schema updates...")
        
        # Drop old check constraint and recreate it to include 'Assessment' and 'Ignored'
        try:
            # Robustly drop any existing check constraints on this table
            cursor.execute("""
                DO $$
                DECLARE
                    r record;
                BEGIN
                    FOR r IN 
                        SELECT conname 
                        FROM pg_constraint 
                        WHERE conrelid = 'job_applications'::regclass AND contype = 'c'
                    LOOP
                        EXECUTE 'ALTER TABLE job_applications DROP CONSTRAINT ' || quote_ident(r.conname);
                    END LOOP;
                END $$;
            """)
            cursor.execute("ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check CHECK (status IN ('Applied', 'Shortlisted', 'Assessment', 'Interview', 'Rejected', 'Offer', 'Ignored'))")
        except Exception as e:
            print(f"  -> Warning updating status constraint: {e}")

        alterations = [
            ("source", "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'"),
            ("email_message_id", "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS email_message_id VARCHAR(255)"),
            ("job_reference_id", "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_reference_id VARCHAR(100)"),
            ("updated_at", "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
            ("interview_date", "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP"),
            ("assessment_date", "ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS assessment_date TIMESTAMP")
        ]

        for col_name, sql in alterations:
            cursor.execute(sql)

        # Add indexes
        print("Migrating: Creating indexes if not exists...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_status ON job_applications (user_id, status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_msg ON job_applications (user_id, email_message_id)")

        # Create gmail_tokens table
        print("Migrating: Creating 'gmail_tokens' table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS gmail_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL UNIQUE,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            token_expiry TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)

        # Create email_scans table
        print("Migrating: Creating 'email_scans' table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_scans (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            last_scan_date TIMESTAMP,
            emails_scanned INTEGER DEFAULT 0,
            jobs_extracted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_scan ON email_scans (user_id, last_scan_date)")

        # Create notifications table
        print("Migrating: Creating 'notifications' table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(300),
            message TEXT,
            metadata JSON,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_unread ON notifications (user_id, is_read)")

        # Create ai_memory table
        print("Migrating: Creating 'ai_memory' table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_memory (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            memory_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory (user_id, memory_type)")

        # Create daily_briefs table
        print("Migrating: Creating 'daily_briefs' table...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_briefs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            brief_date DATE NOT NULL,
            brief_content JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, brief_date),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)

        # Create function/trigger for updated_at in postgres if not exists
        cursor.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        """)

        # Bind updated_at trigger to job_applications
        cursor.execute("DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications")
        cursor.execute("""
        CREATE TRIGGER update_job_applications_updated_at
            BEFORE UPDATE ON job_applications
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)

        # Bind updated_at trigger to gmail_tokens
        cursor.execute("DROP TRIGGER IF EXISTS update_gmail_tokens_updated_at ON gmail_tokens")
        cursor.execute("""
        CREATE TRIGGER update_gmail_tokens_updated_at
            BEFORE UPDATE ON gmail_tokens
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """)

        conn.commit()
        print("Database migration completed successfully!")

    except Exception as e:
        print(f"Migration error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migrations()
