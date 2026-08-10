-- =====================================================
--  Job Tracker — Full Database Schema (PostgreSQL)
-- =====================================================

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    google_id VARCHAR(255),
    auth_provider VARCHAR(50) DEFAULT 'google',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== JOB APPLICATIONS ====================
CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(200) NOT NULL,
    role VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    status VARCHAR(50) DEFAULT 'Applied',
    applied_date DATE,
    interview_date TIMESTAMP,
    assessment_date TIMESTAMP,
    source VARCHAR(50) DEFAULT 'manual',
    email_message_id VARCHAR(255),
    job_reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_status ON job_applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_email_msg ON job_applications (user_id, email_message_id);

-- ==================== GMAIL TOKENS ====================
CREATE TABLE IF NOT EXISTS gmail_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== EMAIL SCANS ====================
CREATE TABLE IF NOT EXISTS email_scans (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_scan_date TIMESTAMP,
    emails_scanned INT DEFAULT 0,
    jobs_extracted INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_scan ON email_scans (user_id, last_scan_date);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(300),
    message TEXT,
    metadata JSON,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_unread ON notifications (user_id, is_read);

-- ==================== AI MEMORY & BRIEFS ====================
CREATE TABLE IF NOT EXISTS ai_memory (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON ai_memory (user_id, memory_type);

CREATE TABLE IF NOT EXISTS daily_briefs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brief_date DATE NOT NULL,
    brief_content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, brief_date)
);
