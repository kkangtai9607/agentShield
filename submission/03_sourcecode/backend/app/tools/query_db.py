import sqlite3
from pathlib import Path

from app.core.config import get_settings

DB_PATH = Path(get_settings().DATABASE_URL.replace("sqlite:///", ""))


def _get_conn():
    return sqlite3.connect(str(DB_PATH))


def query_db(sql: str) -> str:
    """Execute read-only SELECT queries on demo_students."""
    sql_stripped = sql.strip()
    if not sql_stripped.upper().startswith("SELECT"):
        raise PermissionError("仅允许 SELECT 查询")

    conn = _get_conn()
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(sql_stripped)
        rows = cursor.fetchall()
        if not rows:
            return "查询结果为空"
        headers = rows[0].keys()
        lines = [" | ".join(headers)]
        for row in rows[:50]:
            lines.append(" | ".join(str(v) for v in row))
        return "\n".join(lines)
    finally:
        conn.close()
