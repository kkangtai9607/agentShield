"""策略在线保存测试。"""

import tempfile
from pathlib import Path

import yaml

from app.models.policy import PolicyConfig, PolicyLoader


def test_policy_loader_save_roundtrip(tmp_path: Path):
    src = Path(__file__).resolve().parents[1] / "app" / "policies" / "default_policy.yaml"
    target = tmp_path / "policy.yaml"
    target.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    loader = PolicyLoader(policy_path=target)
    config = loader.load()
    config.sensitive_paths = list(config.sensitive_paths) + ["test_path_demo"]
    loader.save(config)

    reloaded = yaml.safe_load(target.read_text(encoding="utf-8"))
    assert "test_path_demo" in reloaded["sensitive_paths"]

    # 还原写入，避免影响其他测试
    config.sensitive_paths = [p for p in config.sensitive_paths if p != "test_path_demo"]
    loader.save(config)
