"""规则防绕过：规范化后应拦截变体攻击。"""

from app.shield.normalize import normalize_path, normalize_sql, normalize_shell
from app.shield.policy_engine import policy_engine


def test_normalize_secret_variants():
    assert "secret" in normalize_path("sandbox/s e c r e t.txt").replace(" ", "")
    assert "secret" in normalize_path("sandbox/ｓｅｃｒｅｔ.txt")
    assert "secret" in normalize_path("sandbox/./secret.txt")


def test_bypass_read_secret_spaced():
    r = policy_engine.evaluate(
        user_role="student",
        tool_name="read_file",
        tool_args={"path": "sandbox/s e c r e t.txt"},
        user_input="读取",
    )
    assert r["decision"] == "block"


def test_bypass_read_secret_fullwidth():
    r = policy_engine.evaluate(
        user_role="student",
        tool_name="read_file",
        tool_args={"path": "sandbox/ｓｅｃｒｅｔ.txt"},
        user_input="读取",
    )
    assert r["decision"] == "block"


def test_bypass_sql_comment_and_spaces():
    for sql in ("SELECT/**/*/*/FROM students", "SELECT  *  FROM   students"):
        r = policy_engine.evaluate(
            user_role="teacher",
            tool_name="query_db",
            tool_args={"sql": sql},
            user_input="查询",
        )
        assert r["decision"] == "block", sql


def test_bypass_rm_rf_spaced():
    r = policy_engine.evaluate(
        user_role="admin",
        tool_name="run_shell",
        tool_args={"command": "rm  -rf  sandbox"},
        user_input="清理",
    )
    assert r["decision"] == "block"


def test_normalize_sql_strips_comments():
    assert normalize_sql("SELECT/**/*/*/FROM students") == "SELECT FROM STUDENTS"
    assert normalize_sql("SELECT  *  FROM   students") == "SELECT * FROM STUDENTS"
