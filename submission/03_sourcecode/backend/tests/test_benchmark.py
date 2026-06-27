"""Benchmark 样本集应达到可答辩的检出率。"""

from fastapi.testclient import TestClient

from app.benchmark.runner import evaluate_single_sample, run_benchmark


def test_benchmark_detection_rate():
    report = run_benchmark()
    assert report["total_samples"] >= 20
    assert report["detection_rate_percent"] >= 90.0, report["results"]
    assert report["false_positive_rate_percent"] <= 10.0, report["results"]


def test_benchmark_bypass_category():
    report = run_benchmark()
    bypass = report["category_stats"].get("bypass", {})
    if bypass.get("total"):
        assert bypass["rate"] >= 85.0, report["results"]


def test_evaluate_single_custom_sample():
    row = evaluate_single_sample(
        user_role="student",
        tool_name="read_file",
        tool_args={"path": "sandbox/secret.txt"},
        user_input="评委现场测试",
        expected_decision="block",
        sample_id="judge_live",
        category="custom",
    )
    assert row["actual_decision"] == "block"
    assert row["passed"] is True
    assert row["engine"] == "policy_engine.evaluate"
    assert row["reason"]


def test_benchmark_evaluate_api(auth_client: TestClient):
    login = auth_client.post(
        "/api/auth/login",
        json={"username": "admin01", "password": "admin123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    res = auth_client.post(
        "/api/benchmark/evaluate",
        headers=headers,
        json={
            "user_role": "teacher",
            "tool_name": "query_db",
            "tool_args": {"sql": "SELECT * FROM students"},
            "user_input": "评委自拟",
            "expected_decision": "block",
            "label": "api-judge-test",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["actual_decision"] == "block"
    assert data["passed"] is True
    assert data["engine"] == "policy_engine.evaluate"

