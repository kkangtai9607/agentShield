from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    API_BASE: str = "https://api.openai.com/v1"
    API_KEY: str = ""
    MODEL_NAME: str = "gpt-4o-mini"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'agentshield.db'}"
    SANDBOX_DIR: str = str(BASE_DIR / "app" / "sandbox")
    # 比赛演示默认强制 mock，避免误配 API_KEY 导致走真实 LLM 返回错误计划
    USE_MOCK_LLM: bool = True

    # API 鉴权
    JWT_SECRET: str = "agentshield-demo-secret-change-in-production"
    JWT_EXPIRE_HOURS: int = 24
    AUTH_DISABLED: bool = False

    # 服务监听与 CORS（局域网演示 / 生产域名）
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOW_LAN: bool = True
    # 生产环境：逗号分隔，如 https://agentshieldtop.xyz,https://www.agentshieldtop.xyz
    CORS_ORIGINS: str = ""

    # 策略场景包（campus/personal/enterprise），留空则读 active_profile.json
    POLICY_PROFILE: str = ""

    # 用户自有策略文件（设置后优先于演示场景包，即插即用）
    POLICY_FILE: str = ""

    # 语义风险检查（本地相似度 / 可选 LLM Judge）
    SEMANTIC_CHECK_ENABLED: bool = True
    SEMANTIC_CHECK_MODE: str = "local"  # local | llm | off
    SEMANTIC_MODEL_NAME: str = ""
    SEMANTIC_SIMILARITY_THRESHOLD: float = 0.62
    SEMANTIC_BLOCK_THRESHOLD: float = 0.88
    SEMANTIC_CONFIRM_THRESHOLD: float = 0.75
    SEMANTIC_LLM_TIMEOUT: float = 12.0

    @property
    def use_mock_llm(self) -> bool:
        if self.USE_MOCK_LLM:
            return True
        return not self.API_KEY or self.API_KEY.strip() == ""

    @property
    def sandbox_path(self) -> Path:
        return Path(self.SANDBOX_DIR).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
