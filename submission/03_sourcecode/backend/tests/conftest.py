import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel

# 测试使用独立内存库，避免污染开发库
os.environ.setdefault("USE_MOCK_LLM", "true")
os.environ.setdefault("AUTH_DISABLED", "true")
os.environ.setdefault("POLICY_FILE", "")
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"

from app.core.config import get_settings

get_settings.cache_clear()

from app.core.database import engine, init_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()
    yield
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def reset_active_policy_profile():
    """每个测试后恢复校园演示策略，避免 profile 切换测试污染其它用例。"""
    from app.models.policy import get_policy_loader
    from app.shield.policy_engine import policy_engine

    loader = get_policy_loader()
    loader.switch_profile("campus")
    policy_engine.reload()
    yield
    loader.switch_profile("campus")
    policy_engine.reload()


@pytest.fixture
def auth_client():
    os.environ["AUTH_DISABLED"] = "false"
    get_settings.cache_clear()
    from app.main import app

    with TestClient(app) as client:
        yield client
    os.environ["AUTH_DISABLED"] = "true"
    get_settings.cache_clear()
