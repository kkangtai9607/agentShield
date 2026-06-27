"""AgentShield MCP Server：工具经 MCP 协议暴露，执行前过安全网关。"""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from app.agents.shield_executor import execute_via_shield

mcp = FastMCP(
    "AgentShield MCP",
    instructions="AgentShield 保护的 MCP 工具服务。所有工具调用均经安全网关拦截与审计。",
)


@mcp.tool()
def read_file(path: str) -> str:
    """读取 sandbox 目录下的文件。"""
    return execute_via_shield("read_file", {"path": path})


@mcp.tool()
def send_email(to: str, subject: str, body: str) -> str:
    """模拟发送邮件（不真正外发）。"""
    return execute_via_shield(
        "send_email", {"to": to, "subject": subject, "body": body}
    )


@mcp.tool()
def query_db(sql: str) -> str:
    """执行只读 SQL 查询 demo 学生表。"""
    return execute_via_shield("query_db", {"sql": sql})


@mcp.tool()
def run_shell(command: str) -> str:
    """在 sandbox 目录执行受限 Shell 命令。"""
    return execute_via_shield("run_shell", {"command": command})


@mcp.tool()
def browser_mock(url: str) -> str:
    """模拟浏览网页并返回页面内容。"""
    return execute_via_shield("browser_mock", {"url": url})


if __name__ == "__main__":
    mcp.run(transport="stdio")
