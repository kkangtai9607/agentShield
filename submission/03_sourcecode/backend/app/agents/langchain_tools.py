from __future__ import annotations

from typing import List

from langchain_core.tools import StructuredTool

from app.agents.shield_executor import execute_via_shield


def build_langchain_tools() -> List[StructuredTool]:
    """将 sandbox 工具封装为 LangChain StructuredTool，执行时经 AgentShield 网关。"""

    def lc_read_file(path: str) -> str:
        """读取 sandbox 目录下的文件。"""
        return execute_via_shield("read_file", {"path": path})

    def lc_send_email(to: str, subject: str, body: str) -> str:
        """模拟发送邮件（不真正外发）。"""
        return execute_via_shield(
            "send_email", {"to": to, "subject": subject, "body": body}
        )

    def lc_query_db(sql: str) -> str:
        """执行只读 SQL 查询 demo 学生表。"""
        return execute_via_shield("query_db", {"sql": sql})

    def lc_run_shell(command: str) -> str:
        """在 sandbox 目录执行受限 Shell 命令。"""
        return execute_via_shield("run_shell", {"command": command})

    def lc_browser_mock(url: str) -> str:
        """模拟浏览网页并返回页面内容。"""
        return execute_via_shield("browser_mock", {"url": url})

    return [
        StructuredTool.from_function(
            func=lc_read_file,
            name="read_file",
            description="读取 sandbox 目录下的文件",
        ),
        StructuredTool.from_function(
            func=lc_send_email,
            name="send_email",
            description="模拟发送邮件",
        ),
        StructuredTool.from_function(
            func=lc_query_db,
            name="query_db",
            description="执行 SELECT 查询 demo 学生表",
        ),
        StructuredTool.from_function(
            func=lc_run_shell,
            name="run_shell",
            description="在 sandbox 执行受限 Shell 命令",
        ),
        StructuredTool.from_function(
            func=lc_browser_mock,
            name="browser_mock",
            description="模拟浏览网页",
        ),
    ]
