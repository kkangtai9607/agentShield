import json
from datetime import datetime
from pathlib import Path

from app.core.config import BASE_DIR


MOCK_EMAILS_FILE = BASE_DIR / "mock_sent_emails.json"


def send_email(to: str, subject: str = "", body: str = "") -> str:
    """Mock email - never sends real email."""
    emails = []
    if MOCK_EMAILS_FILE.exists():
        try:
            emails = json.loads(MOCK_EMAILS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            emails = []

    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "to": to,
        "subject": subject,
        "body": body[:500],
        "status": "mock_sent",
    }
    emails.append(entry)
    MOCK_EMAILS_FILE.write_text(
        json.dumps(emails, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return f"邮件已模拟发送至 {to}（未真实发送）"
