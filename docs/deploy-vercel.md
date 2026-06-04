# Vercel 部署指南

Lumio 是 Next.js App Router 应用，依赖 **PostgreSQL**。Vercel 上不能跑 `docker-compose` 里的本地 Postgres，需要单独托管数据库。

部署后站点默认 **对公网开放**（项目当前无登录鉴权），任何人可访问页面；AI 对话需在「个人资料」中配置模型 API Key 后才会可用。

## 仓库内已提供的配置

| 文件 | 作用 |
|------|------|
| `vercel.json` | 使用 `pnpm install` + `pnpm vercel-build` |
| `package.json` → `vercel-build` | 构建前执行 `db/migrate.mjs`，再 `next build` |
| `.env.example` | 环境变量模板 |

## 你需要完成的步骤

### 1. 准备 Git 远程仓库

若尚未推送代码：

```bash
git remote add origin <你的 GitHub/GitLab 仓库 URL>
git push -u origin main
```

Vercel 通过 Git 连接部署（也可 CLI 部署，见下文）。

### 2. 创建生产用 PostgreSQL

任选其一（需支持 SSL，Serverless 友好）：

- [Neon](https://neon.tech)（推荐：免费档、提供 **pooled** 连接串）
- [Supabase](https://supabase.com) → Project Settings → Database → Connection string
- [Vercel Postgres](https://vercel.com/storage/postgres)（与 Vercel 项目同账号，自动注入 `POSTGRES_URL` 时需映射为 `DATABASE_URL`）

复制 **连接 URL**，形如：

```text
postgres://user:pass@host/dbname?sslmode=require
```

Neon 请优先使用带 `-pooler` 或标注 **Pooled** 的 URL（与 `db/index.ts` 中 `prepare: false` 搭配）。

### 3. 生成密钥

在本地终端生成 `MODEL_CONFIG_SECRET`（任意 ≥32 字符随机串）：

```bash
openssl rand -base64 32
```

部署后 **不要更换**，否则已保存的加密 API Key 无法解密。

### 4. 在 Vercel 创建项目

1. 打开 [vercel.com/new](https://vercel.com/new)，用 GitHub/GitLab 导入 **lumio** 仓库。
2. **Framework Preset**：Next.js（一般会自动识别）。
3. **Root Directory**：仓库根目录（默认即可）。
4. **Build & Development Settings**（若未自动读取 `vercel.json`）：
   - Install Command: `pnpm install`
   - Build Command: `pnpm vercel-build`
5. **Environment Variables**（Production，建议 Production / Preview / Development 都填同一套用于预览）：

   | 变量名 | 说明 | 必填 |
   |--------|------|------|
   | `DATABASE_URL` | 上一步的数据库连接串 | 是 |
   | `MODEL_CONFIG_SECRET` | 上一步生成的密钥 | 是 |
   | `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` | 否 |
   | `DEEPSEEK_MODEL` | 默认 `deepseek-chat` | 否 |

6. 点击 **Deploy**，等待构建完成。

首次成功部署时，`vercel-build` 会在构建机执行迁移，创建 `projects`、`canvas_items` 等表。

### 5. 部署后验证

1. 打开 Vercel 提供的域名（如 `https://lumio-xxx.vercel.app`）。
2. 进入 **个人资料**（`/profile`），配置 DeepSeek API Key 并保存。
3. 创建项目 → 添加文档节点 → 右侧对话，确认流式回复正常。

若构建失败，在 Vercel → **Deployments** → 选中失败记录 → **Building** 日志中查看：

- `DATABASE_URL is required` → 未配置环境变量。
- 数据库连接超时 → URL 错误、未开 SSL、或 IP 白名单限制（Neon 一般无需白名单）。

### 6. 对外公开访问

- **Hobby / Pro 默认**：生产域名对互联网可访问，无需额外设置。
- 若启用了 [Deployment Protection](https://vercel.com/docs/security/deployment-protection)，需在项目 **Settings → Deployment Protection** 关闭或仅对 Preview 开启，否则访客会看到 Vercel 登录墙。
- 自定义域名：**Settings → Domains** 添加 DNS 记录。

### 7. 后续更新代码

推送到连接的分支（通常是 `main`）后，Vercel 自动重新部署；每次构建会再次运行迁移（已执行的 migration 会跳过）。

本地仅改 schema 时：

```bash
pnpm db:generate
# 提交新的 db/migrations/*.sql
git push
```

## 使用 Vercel CLI（可选）

```bash
pnpm add -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add MODEL_CONFIG_SECRET
vercel --prod
```

## 安全说明（公开站点）

当前版本 **没有用户登录**，所有访客共享同一数据库与全局模型配置：

- 任何人可创建/修改画布项目数据。
- 能在 `/profile` 修改 API Key（若你知道该路径）。

若面向公网长期开放，后续建议增加鉴权、按用户隔离数据，并限制设置页访问。短期演示可接受上述风险。

## 本地与生产环境变量对照

| 环境 | 做法 |
|------|------|
| 本地 | 复制 `.env.example` 为 `.env.local` 并填写 |
| Vercel | 在 Dashboard → Environment Variables 填写同名变量 |

本地迁移：

```bash
pnpm db:migrate
```

生产迁移在 Vercel 构建阶段由 `vercel-build` 自动执行，无需单独 SSH。
