"""
AgentShield 即插即用 SDK（进程内嵌入，无需 HTTP 服务）。

快速开始::

    cd agentshield/backend
    PYTHONPATH=. python -c "
    from app.integration import evaluate, configure
    configure(profile='campus')
    print(evaluate(user_role='student', tool_name='read_file', tool_args={'path':'secret.txt'}))
    "
"""

from app.integration.embed import configure, evaluate, guard_tool
from app.integration.wrapper import set_shield_context, shield_tool

__all__ = [
    "configure",
    "evaluate",
    "guard_tool",
    "shield_tool",
    "set_shield_context",
]
