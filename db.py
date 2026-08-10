import os
from urllib.parse import urlparse
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

# ==================== PARSE DATABASE URL ====================
database_url = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")

if database_url:
    parsed = urlparse(database_url)
    db_config = {
        "host": parsed.hostname,
        "user": parsed.username,
        "password": parsed.password,
        "database": parsed.path.lstrip("/"),
        "port": parsed.port or 5432,
    }
else:
    db_config = {
        "host": os.environ.get("DB_HOST", "localhost"),
        "user": os.environ.get("DB_USER", "postgres"),
        "password": os.environ.get("DB_PASSWORD", ""),
        "database": os.environ.get("DB_NAME", "job_tracker_db"),
        "port": int(os.environ.get("DB_PORT", 5432)),
    }

# ==================== CONNECTION WRAPPER ====================
class PooledConnectionWrapper:
    """Wraps a connection from the pool and handles releasing it back on close()."""
    def __init__(self, conn, pool_obj):
        self._conn = conn
        self._pool = pool_obj

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def close(self):
        if self._pool and self._conn:
            self._pool.putconn(self._conn)
            self._conn = None


# ==================== CONNECTION POOL ====================
_pool = None

def get_db_connection():
    """Get a connection from the pool. Instantiates the pool lazily."""
    global _pool
    if _pool is None:
        _pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            **db_config
        )
    conn = _pool.getconn()
    return PooledConnectionWrapper(conn, _pool)


def get_db_cursor(conn):
    """Get a dictionary cursor from a connection."""
    # RealDictCursor returns rows as python dicts
    return conn.cursor(cursor_factory=RealDictCursor)