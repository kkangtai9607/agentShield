import subprocess

from app.core.config import get_settings

ALLOWED_PREFIXES = ("ls", "cat", "python")


def run_shell(command: str) -> str:
    settings = get_settings()
    sandbox = settings.sandbox_path
    sandbox.mkdir(parents=True, exist_ok=True)

    cmd = command.strip()
    cmd_lower = cmd.lower()

    allowed = any(cmd_lower.startswith(p) for p in ALLOWED_PREFIXES)
    if not allowed:
        raise PermissionError(f"命令不在白名单: {command}")

    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=str(sandbox),
            capture_output=True,
            text=True,
            timeout=3,
        )
        output = result.stdout or result.stderr or ""
        if result.returncode != 0 and not output:
            output = f"命令退出码: {result.returncode}"
        return output[:2000]
    except subprocess.TimeoutExpired:
        raise TimeoutError("命令执行超时（3秒）")
