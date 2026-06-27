from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.schemas.shield import ShieldDecision


@dataclass
class AgentRunContext:
    user_id: str
    user_role: str
    user_input: str
    session_id: str
    agent_framework: str
    agent_plan: str = ""
    session_context: Dict[str, Any] = field(default_factory=dict)
    shield_decisions: List[ShieldDecision] = field(default_factory=list)
    tool_trace: List[Dict[str, Any]] = field(default_factory=list)


run_context_var: ContextVar[AgentRunContext | None] = ContextVar(
    "agentshield_run_context", default=None
)
