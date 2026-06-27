AgentShield Competition Submission Package
=========================================

Upload rules reminder:
- Upload FOUR separate zip archives (one per category below).
- Use ASCII file names only (no Chinese characters).
- Do NOT upload folders directly; upload zip/rar/7z only.
- Allowed types: doc/docx/pdf/zip/rar/7z, max 4GB each.

Directory layout (compress each folder into one zip):

  01_documents/     -> agentshield_documents.zip
  02_executable/    -> agentshield_executable.zip
  03_sourcecode/    -> agentshield_sourcecode.zip
  04_other/         -> agentshield_other.zip

Quick pack (optional):

  bash submission/build_submission.sh

Output zips will be in submission/output/

--- 01_documents (作品文档) ---
  AgentShield_Work_Report.docx   作品报告（第十九届信息安全竞赛格式）

--- 02_executable (可执行文件) ---
  run_local_demo.sh              本地一键启动演示（Linux/macOS）
  run_local_demo.ps1             本地一键启动演示（Windows）
  deploy.sh                      生产环境部署脚本
  verify.sh                      上线自检脚本
  start.sh / start.ps1           开发模式启动脚本

--- 03_sourcecode (源代码) ---
  Full AgentShield source tree (no .venv, node_modules, secrets, .git)

--- 04_other (其他) ---
  Demo_URL_and_Accounts.txt        线上演示地址与演示账号
  Project_Links.txt              GitHub 与集成文档索引
  SUBMISSION_CHECKLIST.txt       提交前核对清单

Online demo: http://114.215.209.144:8088
GitHub: https://github.com/huang08666/agentShield
