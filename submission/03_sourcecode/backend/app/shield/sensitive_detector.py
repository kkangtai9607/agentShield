import re
from typing import List, Tuple


PATTERNS: List[Tuple[str, str]] = [
    (r"sk-[a-zA-Z0-9]{8,}", "api_key"),
    (r"API_KEY\s*=\s*[^\s]+", "api_key"),
    (r"password\s*[=:]\s*[^\s]+", "password"),
    (r"token\s*[=:]\s*[^\s]+", "token"),
    (r"Bearer\s+[a-zA-Z0-9._-]+", "bearer_token"),
    (r"1[3-9]\d{9}", "phone"),
    (r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "email"),
    (r"\d{17}[\dXx]", "id_card"),
    (r"(mysql|postgresql|mongodb)://[^\s]+", "db_connection"),
    (r"-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----", "ssh_private_key"),
    (r"DB_URL\s*=\s*[^\s]+", "db_connection"),
]


def detect_sensitive(text: str) -> List[dict]:
    if not text:
        return []
    findings = []
    for pattern, kind in PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            findings.append(
                {
                    "type": kind,
                    "value": match.group(),
                    "start": match.start(),
                    "end": match.end(),
                }
            )
    return findings


def mask_sensitive(text: str) -> str:
    if not text:
        return text
    masked = text
    for pattern, kind in PATTERNS:
        masked = re.sub(
            pattern,
            lambda m, k=kind: f"[MASKED_{k.upper()}]",
            masked,
            flags=re.IGNORECASE,
        )
    return masked
