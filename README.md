# My Site

个人网站全栈项目：React + TypeScript + Vite + Ant Design 前端，Node.js + Express 后端。

> **架构与设计留痕** → 见 [docs/DESIGN.md](./docs/DESIGN.md)（技术栈、API 契约、演进路线、变更迁移指南）

发生**技术栈、依赖、架构或 API 契约**变更后，请在 Cursor 对话中执行 **stack-changelog** skill 同步留痕（输入 `stack-changelog` 或「技术栈留痕」）。Skill 位于 [`.cursor/skills/stack-changelog/`](./.cursor/skills/stack-changelog/SKILL.md)，会自动更新 `docs/DESIGN.md` 的 §2.1 栈表与 §9 变更记录。

**`git push` 前会强制检查**：若待推送提交改了 `package.json`、Prisma schema 等技术栈文件，但未同步 `docs/DESIGN.md`，push 将被拒绝。请先执行 stack-changelog，或本地自检：`npm run check:stack-changelog`。

**Git 提交并推送**：在 Cursor 对话输入 **`crm`**（或「提交并推送」），执行 [`.cursor/skills/crm/`](./.cursor/skills/crm/SKILL.md) 完成 commit → rebase → push；push 前会自动联动 stack-changelog 门禁。

## 项目结构

```
node/
├── client/          # 前端 (React + TS + Vite + Ant Design)
├── server/          # 后端 (Node + Express + TypeScript)
├── docs/            # 设计文档（DESIGN.md）
├── .cursor/skills/  # Cursor Agent Skills（crm、stack-changelog）
└── package.json     # 根脚本，一键启动前后端
```

## 快速开始

```bash
# 安装所有依赖
npm run install:all

# 同时启动前端和后端
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端 |
| `npm run dev:client` | 仅启动前端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run build` | 构建前后端 |
| `npm run check:stack-changelog` | 检查待推送变更是否已同步 DESIGN.md |

## 数据库（SQLite + Prisma）

数据库文件：`server/prisma/dev.db`（本地生成，已 gitignore）

```bash
# 在 server/ 目录下
npm run db:migrate   # 执行迁移（改 schema 后用）
npm run db:seed      # 写入种子数据
npm run db:studio    # 可视化查看/编辑数据
```

首次克隆项目后：

```bash
npm run install:all
cd server && cp .env.example .env   # 或手动创建 .env
npm run db:migrate
```

## API

| 接口 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `GET /api/posts` | 文章列表（数据库） |
| `GET /api/posts/:id` | 文章详情 |
