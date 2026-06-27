"""嵌入模式集成测试（无需 HTTP 服务）。"""

from app.integration.embed import configure, evaluate


def test_embed_evaluate_blocks_secret():
    configure(profile="campus")
    r = evaluate(
        user_role="student",
        tool_name="read_file",
        tool_args={"path": "sandbox/secret.txt"},
        user_input="读密钥",
    )
    assert r["execute_allowed"] is False
    assert r["decision"] == "block"


def test_embed_evaluate_allows_report():
    configure(profile="campus")
    r = evaluate(
        user_role="student",
        tool_name="read_file",
        tool_args={"path": "sandbox/report.txt"},
    )
    assert r["execute_allowed"] is True
    assert r["decision"] == "allow"
