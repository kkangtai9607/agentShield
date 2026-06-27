from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel, Field

from app.core.config import BASE_DIR, get_settings

POLICIES_DIR = BASE_DIR / "app" / "policies"
PROFILES_DIR = POLICIES_DIR / "profiles"
MANIFEST_PATH = POLICIES_DIR / "profile_manifest.yaml"
ACTIVE_PROFILE_PATH = POLICIES_DIR / "active_profile.json"


class PolicyConfig(BaseModel):
    role_permissions: Dict[str, Dict[str, str]] = {}
    tool_risk_level: Dict[str, str] = {}
    sensitive_paths: List[str] = []
    dangerous_shell_patterns: List[str] = []
    dangerous_sql_patterns: List[str] = []
    prompt_injection_patterns: List[str] = []
    external_email_domains: List[str] = []
    decision_thresholds: Dict[str, Dict[str, Any]] = {}
    allowed_shell_commands: List[str] = []


class DemoAccount(BaseModel):
    username: str
    password: str
    role: str
    name: str = ""


class PolicyProfileInfo(BaseModel):
    id: str
    name: str
    description: str = ""
    role_labels: Dict[str, str] = Field(default_factory=dict)
    demo_accounts: List[DemoAccount] = Field(default_factory=list)


class ProfileManager:
    def __init__(self) -> None:
        self._manifest: Optional[Dict[str, Any]] = None

    def load_manifest(self) -> Dict[str, Any]:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            self._manifest = yaml.safe_load(f) or {}
        return self._manifest

    @property
    def manifest(self) -> Dict[str, Any]:
        if self._manifest is None:
            return self.load_manifest()
        return self._manifest

    def list_profiles(self) -> List[PolicyProfileInfo]:
        data = self.manifest.get("profiles", {})
        return [
            PolicyProfileInfo(id=pid, **cfg)
            for pid, cfg in data.items()
        ]

    def get_profile_info(self, profile_id: str) -> PolicyProfileInfo:
        cfg = self.manifest.get("profiles", {}).get(profile_id)
        if not cfg:
            raise KeyError(f"未知策略场景: {profile_id}")
        return PolicyProfileInfo(id=profile_id, **cfg)

    def get_active_profile_id(self) -> str:
        settings = get_settings()
        if settings.POLICY_PROFILE:
            return settings.POLICY_PROFILE
        if ACTIVE_PROFILE_PATH.exists():
            try:
                data = json.loads(ACTIVE_PROFILE_PATH.read_text(encoding="utf-8"))
                pid = data.get("profile_id")
                if pid and (PROFILES_DIR / f"{pid}.yaml").exists():
                    return pid
            except (json.JSONDecodeError, OSError):
                pass
        return self.manifest.get("default_profile", "campus")

    def set_active_profile_id(self, profile_id: str) -> None:
        if not (PROFILES_DIR / f"{profile_id}.yaml").exists():
            raise KeyError(f"策略文件不存在: {profile_id}")
        ACTIVE_PROFILE_PATH.write_text(
            json.dumps({"profile_id": profile_id}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def policy_path_for(self, profile_id: Optional[str] = None) -> Path:
        settings = get_settings()
        if settings.POLICY_FILE:
            path = Path(settings.POLICY_FILE)
            if not path.is_absolute():
                path = (BASE_DIR / path).resolve()
            if path.exists():
                return path
        pid = profile_id or self.get_active_profile_id()
        path = PROFILES_DIR / f"{pid}.yaml"
        if not path.exists():
            # 兼容旧路径
            fallback = POLICIES_DIR / "default_policy.yaml"
            if fallback.exists():
                return fallback
            raise FileNotFoundError(f"策略文件不存在: {path}")
        return path

    def role_labels_for_active(self) -> Dict[str, str]:
        try:
            info = self.get_profile_info(self.get_active_profile_id())
            return info.role_labels
        except KeyError:
            return {}

    def demo_accounts_for_active(self) -> List[DemoAccount]:
        try:
            info = self.get_profile_info(self.get_active_profile_id())
            return info.demo_accounts
        except KeyError:
            return []

    def all_demo_accounts(self) -> List[DemoAccount]:
        accounts: List[DemoAccount] = []
        for profile in self.list_profiles():
            accounts.extend(profile.demo_accounts)
        return accounts


class PolicyLoader:
    def __init__(self, policy_path: Optional[Path] = None):
        self.profile_manager = ProfileManager()
        self.policy_path = policy_path or self.profile_manager.policy_path_for()
        self._config: Optional[PolicyConfig] = None

    def load(self) -> PolicyConfig:
        with open(self.policy_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        self._config = PolicyConfig(**data)
        return self._config

    def reload(self) -> PolicyConfig:
        self.policy_path = self.profile_manager.policy_path_for()
        return self.load()

    def switch_profile(self, profile_id: str) -> PolicyConfig:
        self.profile_manager.set_active_profile_id(profile_id)
        self.policy_path = self.profile_manager.policy_path_for(profile_id)
        return self.load()

    def save(self, config: PolicyConfig) -> PolicyConfig:
        data = config.model_dump()
        with open(self.policy_path, "w", encoding="utf-8") as f:
            yaml.dump(
                data,
                f,
                allow_unicode=True,
                default_flow_style=False,
                sort_keys=False,
            )
        self._config = config
        return self._config

    @property
    def config(self) -> PolicyConfig:
        if self._config is None:
            return self.load()
        return self._config

    @property
    def active_profile_id(self) -> str:
        return self.profile_manager.get_active_profile_id()


_profile_manager = ProfileManager()
_policy_loader = PolicyLoader()


def get_profile_manager() -> ProfileManager:
    return _profile_manager


def get_policy_loader() -> PolicyLoader:
    return _policy_loader
