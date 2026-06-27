from typing import List, Tuple

from app.models.policy import get_policy_loader
from app.shield.normalize import normalize_text


def detect_prompt_injection(text: str) -> Tuple[List[str], int]:
    if not text:
        return [], 0
    policy = get_policy_loader().config
    normalized = normalize_text(text).lower()
    hits: List[str] = []
    score = 0
    for pattern in policy.prompt_injection_patterns:
        pat = normalize_text(pattern).lower()
        if pat and pat in normalized:
            hits.append(pattern)
            score += 15
    return hits, min(score, 40)
