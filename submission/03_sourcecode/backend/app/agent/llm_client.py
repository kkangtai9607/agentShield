import json
import logging
import re

import httpx

from app.core.config import get_settings
from app.schemas.chat import AgentPlan, ToolCall

logger = logging.getLogger(__name__)


async def llm_plan(message: str) -> AgentPlan:
    """真实 LLM 路径；失败时回退到 build_mock_plan。"""
    from app.agent.simple_agent import build_mock_plan, plan_from_dict

    settings = get_settings()

    system_prompt = """你是一个工具调用助手。根据用户请求，输出 JSON 格式的工具调用计划。
可用工具:
- read_file(path): 读取 sandbox 目录文件
- send_email(to, subject, body): 模拟发送邮件
- query_db(sql): 执行 SELECT 查询
- run_shell(command): 在 sandbox 执行 shell 命令

输出格式:
{"thought": "...", "tool_calls": [{"tool_name": "...", "tool_args": {...}}]}
只输出 JSON，不要其他内容。"""

    url = f"{settings.API_BASE.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        "temperature": 0.1,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]

        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if not json_match:
            raise ValueError("LLM 响应中未找到 JSON")

        parsed = json.loads(json_match.group())
        tool_calls = [
            ToolCall(tool_name=t["tool_name"], tool_args=t.get("tool_args", {}))
            for t in parsed.get("tool_calls", [])
        ]
        return AgentPlan(thought=parsed.get("thought", ""), tool_calls=tool_calls)
    except Exception as e:
        logger.warning("LLM 调用失败，回退 mock 计划: %s", e)
        return plan_from_dict(build_mock_plan(message))
