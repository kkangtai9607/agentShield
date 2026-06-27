"""内置攻击场景与 confirm 闭环测试。"""

import json

import pytest

from app.scenarios.scenario_runner import run_scenario
from app.shield.gateway import gateway


class TestScenarios:
    @pytest.mark.parametrize(
        "scenario_id",
        ["malicious_doc", "db_overreach", "dangerous_shell"],
    )
    def test_attack_scenarios_end_with_block(self, scenario_id):
        result = run_scenario(scenario_id)
        assert result["final_decision"] == "block"

    def test_web_pollution_not_allow(self):
        result = run_scenario("web_pollution")
        assert result["final_decision"] in ("block", "mask", "confirm")


class TestConfirmFlow:
    def test_confirm_approve_executes_tool(self):
        pending = gateway.intercept_tool_call(
            user_context={
                "user_id": "teacher01",
                "user_role": "teacher",
                "user_input": "发邮件",
                "session_id": "test-confirm",
                "agent_plan": "发送课程报告邮件",
            },
            tool_call={
                "tool_name": "send_email",
                "tool_args": {
                    "to": "test@example.com",
                    "subject": "课程报告",
                    "body": "报告已完成",
                },
            },
            session_context={},
        )
        assert pending.decision == "confirm"
        assert pending.executed is False
        assert pending.audit_id is not None

        approved = gateway.confirm_pending(pending.audit_id, approved=True)
        assert approved.executed is True
        assert approved.decision == "allow"
        assert approved.audit_id == pending.audit_id

        with pytest.raises(ValueError, match="不是待确认"):
            gateway.confirm_pending(pending.audit_id, approved=True)

    def test_confirm_reject_cancels(self):
        pending = gateway.intercept_tool_call(
            user_context={
                "user_id": "teacher01",
                "user_role": "teacher",
                "user_input": "发邮件",
                "session_id": "test-cancel",
                "agent_plan": "发送邮件",
            },
            tool_call={
                "tool_name": "send_email",
                "tool_args": {
                    "to": "test@example.com",
                    "subject": "x",
                    "body": "y",
                },
            },
            session_context={},
        )
        cancelled = gateway.confirm_pending(pending.audit_id, approved=False)
        assert cancelled.decision == "block"
        assert cancelled.executed is False
        assert cancelled.audit_id == pending.audit_id

    def test_confirm_invalid_audit_raises(self):
        with pytest.raises(ValueError, match="不存在"):
            gateway.confirm_pending(999999, approved=True)
