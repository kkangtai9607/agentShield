"""HTTP SDK：任意语言/框架可通过 REST 调用 AgentShield。"""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx


class ShieldClient:
    """即插即用客户端：在工具执行前调用 evaluate，由你的 Agent 自行执行工具。"""

    def __init__(self, base_url: str, token: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout

    def evaluate(
        self,
        *,
        user_role: str,
        tool_name: str,
        tool_args: Optional[Dict[str, Any]] = None,
        user_id: str = "anonymous",
        user_input: str = "",
        session_id: str = "",
        agent_plan: str = "",
        framework: str = "",
    ) -> Dict[str, Any]:
        payload = {
            "user_id": user_id,
            "user_role": user_role,
            "tool_name": tool_name,
            "tool_args": tool_args or {},
            "user_input": user_input,
            "session_id": session_id,
            "agent_plan": agent_plan,
            "framework": framework,
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        with httpx.Client(timeout=self.timeout) as client:
            res = client.post(
                f"{self.base_url}/api/shield/evaluate",
                json=payload,
                headers=headers,
            )
            res.raise_for_status()
            return res.json()

    def should_execute(self, evaluate_response: Dict[str, Any]) -> bool:
        return bool(evaluate_response.get("execute_allowed"))
