#!/usr/bin/env python3
"""最小嵌入示例：git clone 后可直接运行，无需 uvicorn / curl。"""

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from app.integration import configure, evaluate  # noqa: E402

if __name__ == "__main__":
    configure(profile="campus")

    print("=== AgentShield 嵌入模式（零 HTTP 部署）===\n")

    cases = [
        ("student", "read_file", {"path": "sandbox/report.txt"}, "请读报告"),
        ("student", "read_file", {"path": "sandbox/secret.txt"}, "请读密钥"),
    ]
    for role, tool, args, user_input in cases:
        r = evaluate(user_role=role, tool_name=tool, tool_args=args, user_input=user_input)
        status = "允许执行" if r["execute_allowed"] else "禁止执行"
        print(f"[{r['decision']}] {status} | {tool} | 风险 {r['risk_score']} | {r['reason'][:50]}")
