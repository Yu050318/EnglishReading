# 多科目人力资源题库：Vercel 与 Supabase 补充要求

## 背景

用户补充说明：当前英语刷题网站已经连接 Vercel 和 Supabase。因此“新增人力资源科目题库”不能只考虑本地静态数据，还必须考虑生产部署和云同步兼容。

本文件是以下规格与计划的补充，执行时必须一并阅读：

- `docs/superpowers/specs/2026-07-09-multi-subject-hr-question-bank.md`
- `docs/superpowers/plans/2026-07-09-multi-subject-hr-question-bank.md`

## Supabase 云同步要求

- 不新增 Supabase 表，除非执行时证明现有 JSON 状态结构无法兼容多科目。
- 优先继续使用现有云同步记录和 JSON payload，把多科目状态作为普通 JSON 数据保存。
- 题目 ID 必须跨科目稳定且不冲突，避免英语和人力资源的进度、错题、收藏互相污染。
- 旧云同步 payload 若没有 subject 信息，按英语兼容。
- 如必须修改 Supabase RPC、RLS 或 migration，执行方必须先说明原因，并保证不清空现有学习记录。
- 不读取、不打印、不提交任何 Supabase secret；前端只允许使用 Vercel 注入的 publishable/anon key。
- 验收时必须做一次 Supabase 保存/读取 smoke，使用一次性 device id，确认包含多科目状态的 payload 可正常同步。

## Vercel 生产部署要求

- 功能验收通过后，必须提交并推送到现有 GitHub `origin/main`。
- 使用现有 Vercel Git 集成或 Vercel CLI 完成 production 部署。
- 不提交 `.vercel/`、`.env.local`、`.env*`、token 或任何本地部署副作用文件。
- 部署前确认 Vercel Production 环境变量仍存在；只报告变量名是否存在，不打印值：
  - `VITE_SUPABASE_URL`
  - 项目实际使用的 Supabase publishable/anon key 变量名。
- 线上验收必须覆盖：
  - production URL 首页返回 200。
  - 线上题库包含 `english` 和 `human_resources` 两个 subject。
  - 线上人力资源背题页能加载。
  - 线上 Supabase 保存/读取 smoke 通过。
  - 如果浏览器自动化可用，375px 移动端无横向溢出。

## 对执行计划的补充

在原计划 Task 7 后增加：

1. 检查当前 Supabase 同步 payload 结构。
2. 确保 subject-aware 的 progress、favorite、mistake 数据可 JSON 序列化。
3. 旧云端状态没有 subject 时按英语处理。
4. 若无需改 Supabase schema/RPC，在回报中明确：“no Supabase schema change required”。

在原计划 Task 9 后增加：

1. 推送后等待 Vercel production deployment。
2. 验证 Vercel Production env 变量名存在但不打印值。
3. 验证线上题库两个 subject 都存在。
4. 用一次性 device id 做 Supabase RPC save/read smoke。
5. 回报 production URL、deployment/inspect URL、commit hash、线上验证结果。
