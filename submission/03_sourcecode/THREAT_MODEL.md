# AgentShield 威胁模型（答辩用）

## 1. 系统边界

```
[用户] → [Agent 规划层] → [AgentShield 网关] → [沙箱工具] → [外部资源模拟]
                ↑                    ↑
           SimpleAgent          PolicyEngine
           LangChain            ContentGuard
           MCP Client           AuditLog
```

**信任边界**：Agent 规划层不可信；工具参数与工具返回均视为不可信输入。

## 2. STRIDE 映射

| 威胁 | 描述 | AgentShield 对策 | 演示场景 |
|------|------|------------------|----------|
| **S** 伪造 | 伪造角色调用高危工具 | RBAC 角色权限 | student 发邮件 → block |
| **T** 篡改 | 篡改 SQL/Shell 参数 | 危险模式规则 | `SELECT *` / `rm -rf` |
| **R** 抵赖 | 否认曾发起工具调用 | SQLite 全链路审计 | 审计日志页 |
| **I** 泄露 | 读取/外发敏感数据 | 敏感路径 + 脱敏 + 会话链 | secret.txt / 恶意文档 |
| **D** 拒绝服务 | 危险 Shell 破坏 | 白名单 + sandbox + 超时 | dangerous_shell |
| **E** 提权 | 间接提示注入绕过规则 | 注入检测 + 内容守卫 | malicious_doc / web_pollution |

## 3. OWASP LLM Top 10 关联

| 风险 | 本项目覆盖 |
|------|------------|
| LLM01 提示注入 | 用户输入、文件、网页、工具返回多点位检测 + **语义意图相似度** |
| LLM02 不安全输出 | ContentGuard 对工具返回二次检查 |
| LLM06 敏感信息泄露 | mask 决策 + sensitive_detector |
| LLM08 过度代理 | 四层决策 block/confirm 限制 Agent 行为 |
| LLM09 过度依赖 | 人工 confirm 闭环（`POST /api/shield/confirm/{id}`） |

## 4. 四类内置攻击剧本

1. **间接提示注入** — 恶意文档诱导多步工具链
2. **工具返回污染** — 网页内容含注入指令
3. **数据越权** — 全表查询替代统计查询
4. **危险操作** — 破坏性 Shell 命令

## 5. 已知局限（答辩诚实声明）

- Agent 规划层默认 Mock，真实 LLM 行为不可控
- 语义检查默认 **本地意图相似度**（`semantic_intents.yaml` + 双字片段召回）；配置 `SEMANTIC_CHECK_MODE=llm` 且提供 API Key 时可启用 LLM Judge 二次研判
- 本地语义相似度对极短输入、跨语言混合话术仍可能误报/漏报，需与规则引擎联合使用
- 无 API 鉴权时 `user_role` 由 JWT 签发（演示环境可 AUTH_DISABLED）
- 审计日志无防篡改签名
- MCP 演示为进程内传输，非远程部署

## 6. 竞品差异（一句话）

> 传统 Prompt 防火墙看「说了什么」；AgentShield 看「准备执行什么」。
