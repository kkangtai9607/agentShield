from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db
from app.data.init_demo_data import init_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_demo_data()
    yield


app = FastAPI(
    title="AgentShield",
    description="面向大模型智能体工具调用的安全防护网关",
    version="1.0.0",
    lifespan=lifespan,
)

_settings = get_settings()
_cors_kwargs: dict = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
_cors_origins = [o.strip() for o in _settings.CORS_ORIGINS.split(",") if o.strip()]
if _cors_origins:
    _cors_kwargs["allow_origins"] = _cors_origins
elif _settings.ALLOW_LAN:
    # 允许 localhost、局域网 IP、公网 IP:端口 演示（如 http://114.215.209.144:8088）
    _cors_kwargs["allow_origin_regex"] = (
        r"https?://("
        r"localhost|127\.0\.0\.1"
        r"|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
        r")(:\d+)?"
    )
else:
    _cors_kwargs["allow_origins"] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
app.add_middleware(CORSMiddleware, **_cors_kwargs)


@app.get("/health")
def health_check():
    from sqlmodel import Session, select, func

    from app.core.database import engine
    from app.models.audit import AuditLog

    from app.models.policy import get_policy_loader, get_profile_manager
    from app.shield.semantic_checker import effective_semantic_mode

    settings = get_settings()
    audit_total = 0
    pending_confirm = 0
    try:
        with Session(engine) as session:
            audit_total = session.exec(select(func.count()).select_from(AuditLog)).one()
            pending_confirm = session.exec(
                select(func.count())
                .select_from(AuditLog)
                .where(AuditLog.decision == "confirm")
            ).one()
    except Exception:
        pass

    return {
        "status": "ok",
        "service": "AgentShield",
        "use_mock_llm": settings.use_mock_llm,
        "plan_engine": "build_mock_plan" if settings.use_mock_llm else "llm_api",
        "audit_total": audit_total,
        "pending_confirm": pending_confirm,
        "auth_disabled": settings.AUTH_DISABLED,
        "active_profile": get_policy_loader().active_profile_id,
        "profile_name": _profile_name(get_profile_manager(), get_policy_loader().active_profile_id),
        "semantic_check": {
            "enabled": settings.SEMANTIC_CHECK_ENABLED,
            "mode": effective_semantic_mode(),
        },
    }


def _profile_name(manager, profile_id: str) -> str:
    try:
        return manager.get_profile_info(profile_id).name
    except KeyError:
        return profile_id


def _register_routes():
    from app.api.routes_agents import router as agents_router
    from app.api.routes_audit import router as audit_router
    from app.api.routes_auth import router as auth_router
    from app.api.routes_benchmark import router as benchmark_router
    from app.api.routes_chat import router as chat_router
    from app.api.routes_integration import router as integration_router
    from app.api.routes_policy import router as policy_router
    from app.api.routes_scenarios import router as scenarios_router
    from app.api.routes_semantic import router as semantic_router
    from app.api.routes_shield import router as shield_router

    app.include_router(auth_router, prefix="/api", tags=["auth"])
    app.include_router(chat_router, prefix="/api", tags=["chat"])
    app.include_router(agents_router, prefix="/api", tags=["agents"])
    app.include_router(shield_router, prefix="/api", tags=["shield"])
    app.include_router(integration_router, prefix="/api", tags=["integration"])
    app.include_router(benchmark_router, prefix="/api", tags=["benchmark"])
    app.include_router(audit_router, prefix="/api", tags=["audit"])
    app.include_router(policy_router, prefix="/api", tags=["policy"])
    app.include_router(scenarios_router, prefix="/api", tags=["scenarios"])
    app.include_router(semantic_router, prefix="/api", tags=["semantic"])


_register_routes()
