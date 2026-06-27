"""API 鉴权：未登录拒绝、登录后可访问。"""

from fastapi.testclient import TestClient


def test_chat_requires_auth(auth_client):
    res = auth_client.post("/api/chat", json={"message": "hello"})
    assert res.status_code == 401


def test_login_and_chat(auth_client):
    login = auth_client.post(
        "/api/auth/login",
        json={"username": "student01", "password": "student123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    res = auth_client.post("/api/chat", json={"message": "请总结 report.txt"}, headers=headers)
    assert res.status_code == 200
    me = auth_client.get("/api/auth/me", headers=headers)
    assert me.json()["user_role"] == "student"
