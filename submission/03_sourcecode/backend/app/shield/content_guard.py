from typing import Tuple

from app.shield.prompt_injection_detector import detect_prompt_injection
from app.shield.semantic_checker import run_semantic_check
from app.shield.sensitive_detector import detect_sensitive, mask_sensitive


def check_content(text: str) -> Tuple[str, int, str]:
    """Check tool return content; mask if sensitive, injection, or semantic risk detected."""
    if not text:
        return text, 0, ""

    injection_hits, injection_score = detect_prompt_injection(text)
    sensitive_hits = detect_sensitive(text)
    semantic = run_semantic_check(tool_output=text)
    reasons = []

    if injection_hits:
        reasons.append(f"工具输出含提示注入模式: {', '.join(injection_hits[:3])}")

    if sensitive_hits:
        reasons.append(f"工具输出含 {len(sensitive_hits)} 处敏感信息")

    if semantic.hits:
        reasons.append(semantic.reason)

    total_score = injection_score + semantic.risk_score
    if sensitive_hits:
        total_score += min(len(sensitive_hits) * 10, 30)

    if sensitive_hits or injection_hits or semantic.hits:
        return mask_sensitive(text), total_score, "; ".join(reasons)

    return text, 0, ""
