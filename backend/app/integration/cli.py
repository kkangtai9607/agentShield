#!/usr/bin/env python3
"""AgentShield 命令行：init / check / demo — 无需手写 curl。"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE = BACKEND_ROOT / "config" / "user_policy.template.yaml"
if not TEMPLATE.exists():
    TEMPLATE = BACKEND_ROOT / "app" / "policies" / "user_policy.template.yaml"

STARTER_PY = '''"""AgentShield 嵌入模式示例 — 无需启动 uvicorn。"""
import sys
from pathlib import Path

# 将 backend 加入路径（若已 pip install -e . 可删除下面两行）
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "agentshield" / "backend"))

from app.integration import configure, evaluate, guard_tool, set_shield_context


def main():
    configure(policy_file=str(ROOT / "my_policy.yaml"))  # 或 configure(profile="campus")

    # 方式 1：每次工具调用前 evaluate
    r = evaluate(
        user_role="operator",
        tool_name="send_email",
        tool_args={"to": "test@example.com", "subject": "hi", "body": "hello"},
        user_input="发邮件",
    )
    print("evaluate:", r)
    if r["execute_allowed"]:
        print("→ 此处执行你的真实 send_email")

    # 方式 2：装饰器自动拦截
    set_shield_context(user_role="operator", user_id="demo")

    @guard_tool("my_search")
    def my_search(q: str) -> str:
        return f"搜索结果: {q}"

    try:
        print(my_search("AgentShield"))
    except PermissionError as e:
        print("blocked:", e)


if __name__ == "__main__":
    main()
'''

README_SNippet = """# AgentShield 本地集成

## 零部署（推荐）

```bash
cd agentshield/backend
PYTHONPATH=. python ../examples/minimal_embed.py
```

## 一条命令检查

```bash
PYTHONPATH=. python -m app.integration.cli check \\
  --role student --tool read_file --args '{"path":"secret.txt"}'
```

## 可选：HTTP 网关

线上演示：https://agentshieldtop.xyz →「快速集成 → 在线试集成」
或 POST https://agentshieldtop.xyz/api/shield/evaluate
开源仓库：https://github.com/kkangtai9607/agentShield
"""


def cmd_init(target: Path) -> int:
    target.mkdir(parents=True, exist_ok=True)
    policy_dst = target / "my_policy.yaml"
    if not policy_dst.exists() and TEMPLATE.exists():
        shutil.copy(TEMPLATE, policy_dst)
    starter = target / "my_agent_with_shield.py"
    starter.write_text(STARTER_PY.replace(
        'ROOT / "agentshield" / "backend"',
        f'ROOT / "{target.name}" / "backend"' if (target / "backend").exists() else 'ROOT.parent / "agentshield" / "backend"',
    ), encoding="utf-8")
    readme = target / "AGENTSHIELD_QUICKSTART.md"
    readme.write_text(README_SNippet, encoding="utf-8")
    print(f"✓ 已生成 {policy_dst}")
    print(f"✓ 已生成 {starter}")
    print(f"✓ 已生成 {readme}")
    print("\n下一步: 编辑 my_policy.yaml，然后运行 my_agent_with_shield.py")
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    from app.integration.embed import configure, evaluate

    if args.policy:
        configure(policy_file=args.policy)
    elif args.profile:
        configure(profile=args.profile)
    else:
        configure(profile="campus")

    tool_args = json.loads(args.args) if args.args else {}
    result = evaluate(
        user_role=args.role,
        tool_name=args.tool,
        tool_args=tool_args,
        user_input=args.input or "",
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("execute_allowed") or args.allow_block else 1


def cmd_demo(_: argparse.Namespace) -> int:
    from app.integration.embed import configure, evaluate

    configure(profile="campus")
    cases = [
        ("student", "read_file", {"path": "sandbox/report.txt"}, "读报告"),
        ("student", "read_file", {"path": "sandbox/secret.txt"}, "读密钥"),
        ("teacher", "send_email", {"to": "test@example.com", "subject": "x", "body": "y"}, "发邮件"),
    ]
    print("AgentShield 嵌入模式演示（无需 HTTP 服务）\n")
    for role, tool, targs, inp in cases:
        r = evaluate(user_role=role, tool_name=tool, tool_args=targs, user_input=inp)
        icon = "✓" if r["execute_allowed"] else "✗"
        print(f"{icon} [{r['decision']}] {role} → {tool}  风险={r['risk_score']}  {r['reason'][:60]}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="agentshield",
        description="AgentShield CLI — init / check / demo，无需 curl 与独立部署网关",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_init = sub.add_parser("init", help="在当前目录生成策略模板与示例脚本")
    p_init.add_argument("directory", nargs="?", default=".", type=Path)

    p_check = sub.add_parser("check", help="检查一次工具调用是否允许")
    p_check.add_argument("--role", required=True, help="用户角色，对应 policy 中 role_permissions")
    p_check.add_argument("--tool", required=True, help="工具名")
    p_check.add_argument("--args", default="{}", help="工具参数 JSON")
    p_check.add_argument("--input", default="", help="用户原始输入")
    p_check.add_argument("--policy", help="策略 YAML 路径")
    p_check.add_argument("--profile", help="演示场景 campus/personal/enterprise")
    p_check.add_argument("--allow-block", action="store_true", help="block 时也返回 0（仅打印结果）")

    sub.add_parser("demo", help="运行内置演示用例")

    args = parser.parse_args(argv)
    if args.command == "init":
        return cmd_init(args.directory.resolve())
    if args.command == "check":
        return cmd_check(args)
    if args.command == "demo":
        return cmd_demo(args)
    return 1


if __name__ == "__main__":
    sys.exit(main())
