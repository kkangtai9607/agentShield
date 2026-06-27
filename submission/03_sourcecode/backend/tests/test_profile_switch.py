"""多场景策略包切换测试。"""

from pathlib import Path

from fastapi.testclient import TestClient

from app.models.policy import PolicyLoader, get_policy_loader, get_profile_manager
from app.shield.policy_engine import policy_engine


def test_list_policy_profiles():
    profiles = get_profile_manager().list_profiles()
    ids = {p.id for p in profiles}
    assert ids == {"campus", "personal", "enterprise"}


def test_personal_profile_permissions():
    path = Path(__file__).resolve().parents[1] / "app" / "policies" / "profiles" / "personal.yaml"
    config = PolicyLoader(policy_path=path).load()
    assert config.role_permissions["owner"]["send_email"] == "confirm"
    assert config.role_permissions["guest"]["query_db"] == "deny"


def test_enterprise_profile_permissions():
    path = Path(__file__).resolve().parents[1] / "app" / "policies" / "profiles" / "enterprise.yaml"
    config = PolicyLoader(policy_path=path).load()
    assert config.role_permissions["agent"]["send_email"] == "confirm"
    assert config.role_permissions["supervisor"]["send_email"] == "allow"


def test_switch_profile_reload_engine():
    loader = get_policy_loader()
    original = loader.active_profile_id
    try:
        loader.switch_profile("personal")
        policy_engine.reload()
        r = policy_engine.evaluate(
            "guest",
            "query_db",
            {"sql": "SELECT COUNT(*) FROM students"},
            user_input="查询",
        )
        assert r["decision"] == "block"
        loader.switch_profile("campus")
        policy_engine.reload()
        r2 = policy_engine.evaluate(
            "student",
            "query_db",
            {"sql": "SELECT COUNT(*) FROM students"},
            user_input="查询",
        )
        assert r2["decision"] == "allow"
    finally:
        if loader.active_profile_id != original:
            loader.switch_profile(original)
            policy_engine.reload()


def test_activate_profile_api(auth_client: TestClient):
    login = auth_client.post(
        "/api/auth/login",
        json={"username": "admin01", "password": "admin123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = auth_client.post("/api/policies/profile/personal/activate", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["active_profile"] == "personal"
    assert "owner" in data["role_labels"]

    accounts = auth_client.get("/api/auth/demo-accounts")
    assert accounts.status_code == 200
    usernames = {a["username"] for a in accounts.json()}
    assert "owner01" in usernames

    auth_client.post("/api/policies/profile/campus/activate", headers=headers)


def test_owner_login_personal(auth_client: TestClient):
    auth_client.post(
        "/api/policies/profile/personal/activate",
        headers={"Authorization": f"Bearer {auth_client.post('/api/auth/login', json={'username':'admin01','password':'admin123'}).json()['access_token']}"},
    )
    login = auth_client.post(
        "/api/auth/login",
        json={"username": "owner01", "password": "owner123"},
    )
    assert login.status_code == 200
    assert login.json()["user_role"] == "owner"
    get_policy_loader().switch_profile("campus")
    policy_engine.reload()
