from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


class BenchmarkEvaluateRequest(BaseModel):
    """评委现场自拟样本：直接调用与线上一致的 policy_engine.evaluate。"""

    user_role: str
    tool_name: Literal["read_file", "send_email", "query_db", "run_shell", "browser_mock"]
    tool_args: Dict[str, Any] = Field(default_factory=dict)
    user_input: str = ""
    expected_decision: Optional[Literal["allow", "mask", "confirm", "block"]] = None
    label: Optional[str] = Field(None, description="可选备注，便于答辩记录")


class BenchmarkEvaluateResponse(BaseModel):
    id: str
    category: str
    user_role: str
    tool_name: str
    tool_args: Dict[str, Any]
    user_input: str
    expected_decision: Optional[str]
    actual_decision: str
    risk_score: int
    risk_level: str
    reason: str
    suggestion: str
    passed: Optional[bool]
    latency_ms: float
    engine: str
