import os
from pathlib import Path

from app.core.config import get_settings


def _resolve_sandbox_path(path: str) -> Path:
    settings = get_settings()
    sandbox = settings.sandbox_path
    sandbox.mkdir(parents=True, exist_ok=True)

    # Normalize: strip sandbox prefix if present
    clean = path.replace("\\", "/")
    if clean.startswith("sandbox/"):
        clean = clean[len("sandbox/"):]

    target = (sandbox / clean).resolve()

    # Path traversal check
    try:
        target.relative_to(sandbox.resolve())
    except ValueError:
        raise PermissionError(f"路径穿越被拒绝: {path}")

    return target


def read_file(path: str) -> str:
    target = _resolve_sandbox_path(path)
    if not target.exists():
        raise FileNotFoundError(f"文件不存在: {path}")
    if not target.is_file():
        raise ValueError(f"不是有效文件: {path}")
    return target.read_text(encoding="utf-8")
