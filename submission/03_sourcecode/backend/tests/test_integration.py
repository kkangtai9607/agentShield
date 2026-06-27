"""即插即用集成 API 测试。"""

from fastapi.testclient import TestClient


def test_shield_evaluate_blocks_without_execution(auth_client: TestClient):
    login = auth_client.post(
        "/api/auth/login",
        json={"username": "student01", "password": "student123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = auth_client.post(
        "/api/shield/evaluate",
        headers=headers,
        json={
            "user_role": "student",
            "tool_name": "read_file",
            "tool_args": {"path": "sandbox/secret.txt"},
            "user_input": "读密钥",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["execute_allowed"] is False
    assert data["decision"]["decision"] == "block"
    assert data["decision"]["executed"] is False


def test_shield_evaluate_allow_external_tool(auth_client: TestClient):
    login = auth_client.post(
        "/api/auth/login",
        json={"username": "student01", "password": "student123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    res = auth_client.post(
        "/api/shield/evaluate",
        headers=headers,
        json={
            "user_role": "student",
            "tool_name": "my_custom_api",
            "tool_args": {"q": "hello"},
            "user_input": "搜索",
        },
    )
    assert res.status_code == 200
    data = res.json()
    # 未在 policy deny 的自定义工具名，按风险阈值通常 allow
    assert data["decision"]["executed"] is False
    assert "decision" in data["decision"]


def test_integration_guide(auth_client: TestClient):
    login = auth_client.post(
        "/api/auth/login",
        json={"username": "admin01", "password": "admin123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    res = auth_client.get("/api/integration/guide", headers=headers)
    assert res.status_code == 200
    assert res.json()["evaluate_endpoint"] == "/api/shield/evaluate"
    assert len(res.json()["modes"]) >= 4
