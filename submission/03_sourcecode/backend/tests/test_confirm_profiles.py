"""个人助手 / 企业客服场景人工确认闭环测试。"""

import pytest

from app.models.policy import get_policy_loader
from app.shield.gateway import gateway
from app.shield.policy_engine import policy_engine


@pytest.mark.parametrize(
    "profile,role,tool_args",
    [
        (
            "personal",
            "owner",
            {
                "tool_name": "send_email",
                "tool_args": {
                    "to": "family@home.local",
                    "subject": "安排",
                    "body": "周末安排",
                },
            },
        ),
        (
            "personal",
            "owner",
            {"tool_name": "run_shell", "tool_args": {"command": "ls sandbox"}},
        ),
        (
            "enterprise",
            "agent",
            {
                "tool_name": "send_email",
                "tool_args": {
                    "to": "client@corp.internal",
                    "subject": "回访",
                    "body": "客户回访安排",
                },
            },
        ),
        (
            "enterprise",
            "supervisor",
            {"tool_name": "run_shell", "tool_args": {"command": "ls sandbox"}},
        ),
    ],
)
def test_profile_confirm_approve_executes_tool(profile, role, tool_args):
    loader = get_policy_loader()
    original = loader.active_profile_id
    try:
        loader.switch_profile(profile)
        policy_engine.reload()

        pending = gateway.intercept_tool_call(
            user_context={
                "user_id": f"{role}_demo",
                "user_role": role,
                "user_input": "演示人工确认",
                "session_id": f"test-{profile}-{role}",
                "agent_plan": "人工确认演示",
            },
            tool_call=tool_args,
            session_context={},
        )
        assert pending.decision == "confirm", pending.reason
        assert pending.executed is False
        assert pending.audit_id is not None

        approved = gateway.confirm_pending(pending.audit_id, approved=True)
        assert approved.executed is True
        assert approved.decision == "allow"
    finally:
        if loader.active_profile_id != original:
            loader.switch_profile(original)
            policy_engine.reload()
