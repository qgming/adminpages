<p align="center">
  <img src="./public/icon-mark.svg" alt="菟丝" width="180" />
</p>

<h1 align="center">菟丝动态文件托管</h1>

<p align="center">
  一个部署在 Cloudflare Pages 上的轻量文件托管后台，用 KV 管理 JSON、Markdown 和 HTML 文件。
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" />
  <img alt="Cloudflare Pages" src="https://img.shields.io/badge/Cloudflare-Pages-f38020?logo=cloudflare&logoColor=white" />
  <img alt="Workers KV" src="https://img.shields.io/badge/Workers-KV-f38020?logo=cloudflare&logoColor=white" />
</p>

## 简介

菟丝用于把少量动态文件发布成稳定 URL。你可以在后台创建项目，再为每个项目维护 `.json`、`.md`、`.html` 文件。文件内容保存在 Cloudflare Workers KV 中，公开访问路径形如：

```txt
/<projectId>/<filename>
```

示例：

```txt
/blog/post-1.md
/docs/config.json
/site/index.html
```

## 功能

- 管理后台入口：`/admin`
- 公开文件读取：`/<projectId>/<filename>`
- 支持 JSON、Markdown、HTML 三种文件类型
- JSON 文件默认允许跨域读取
- JSON 保存时自动校验并格式化
- 一键导出 / 导入全部数据，便于备份和迁移
- 首次访问后台时设置管理员密码，SHA-256 哈希存于 KV
- 可选用 `ADMIN_TOKEN` Secret 覆盖首次设置密码模式

## 技术栈

| 分类 | 技术                               |
| ---- | ---------------------------------- |
| 前端 | React 19、TypeScript 6、Vite 8     |
| 样式 | Tailwind CSS 4、shadcn/ui 源码组件 |
| 后端 | Cloudflare Pages Functions         |
| 存储 | Cloudflare Workers KV              |
| 部署 | Cloudflare Pages Git 集成          |

---

## 🚀 部署指南

> ⏱ 预计耗时：约 **5 分钟** · ✅ 全程在浏览器完成，**无需修改任何代码**

### 步骤 1 · Fork 本仓库

打开本仓库 → 右上角 **Fork** → 选择你的 GitHub 账号。

### 步骤 2 · 创建 KV 命名空间 (KV Namespace)

进入 Cloudflare Dashboard，路径：

```txt
Storage & Databases (存储和数据库)
   └─ Workers KV
        └─ Create instance (创建实例)
```

| 字段 (Field)          | 填写内容                         |
| --------------------- | -------------------------------- |
| Namespace name (名称) | `tusi`（任意名字，自己能认即可） |

### 步骤 3 · 连接 GitHub 仓库到 Pages

```txt
Workers & Pages (Workers 和 Pages)
   └─ Create application (创建应用)
        └─ Pages 标签
             └─ Connect to Git (连接到 Git)
                  └─ 选择 fork 的 tusi 仓库 → Begin setup (开始设置)
```

构建配置 (Build settings)：

| 字段 (Field)                      | 值              |
| --------------------------------- | --------------- |
| Build command (构建命令)          | `npm run build` |
| Build output directory (输出目录) | `dist`          |
| Root directory (根目录)           | 留空            |
| Deploy command (部署命令)         | 留空 ⚠ 不要填   |

点击 **Save and Deploy (保存并部署)**，等待首次构建完成。

> ⚠ Deploy command 是普通 Workers 项目用的，Pages 项目留空即可。

### 步骤 4 · 绑定 KV 命名空间 (Bind KV Namespace) ⭐

> 这是最关键的一步，通过 Dashboard 绑定，**无需修改任何代码**。

进入刚刚创建的 Pages 项目：

```txt
Settings (设置)
   └─ Bindings (绑定)
        └─ Add (添加)
             └─ KV namespace (KV 命名空间)
```

| 字段 (Field)           | 填写内容                                        |
| ---------------------- | ----------------------------------------------- |
| Variable name (变量名) | `KV_BINDING` ← **必须严格写成这个，区分大小写** |
| KV namespace           | 下拉选择步骤 2 创建的 `tusi`                    |

> 代码读取的是 `env.KV_BINDING`，Variable name 写错就读不到 KV。

### 步骤 5 · 重新部署并设置管理员密码

绑定生效需要重新部署一次：

```txt
Deployments (部署记录)
   └─ 最新部署右侧 ⋯
        └─ Retry deployment (重试部署)
```

部署完成后访问：

```txt
https://<your-domain>/admin
```

按页面提示设置不少于 **8 位** 的管理员密码，登录即可使用。

---

## 🛟 故障排查

### 访问 `/admin` 显示「KV_BINDING 未绑定」

90% 的情况是步骤 4 没做或没生效。请检查：

1. Variable name 是否**严格等于** `KV_BINDING`（区分大小写、不能加空格）
2. KV namespace 是否选对了
3. 添加绑定后**是否触发了重新部署**（Deployments → Retry deployment）

### 设置密码后无法登录

- 确认密码长度 ≥ 8 位
- 浏览器禁用了 `localStorage`（无痕模式或某些隐私插件）会导致登录态无法保存
- 如果你后来设置了 `ADMIN_TOKEN` Secret，**它会覆盖**你在网页里设的密码，请用 Secret 的值登录

### 公开 URL 返回 404

- 项目 ID 是否拼写正确？大小写敏感
- 文件名包含扩展名了吗？例如 `/blog/post.md` 不是 `/blog/post`
- 文件类型是否在支持范围内？目前仅 `.json` / `.md` / `.html`

### 想用 Wrangler CLI 本地部署

走 Git 集成不需要这一步。若你坚持用 CLI 直接推送：

```bash
# 1. 创建 KV（已有则跳过）
npx wrangler kv namespace create tusi

# 2. 在 Pages → Settings → Bindings 添加 KV 绑定
#    Variable name: KV_BINDING
#    选择第 1 步创建的 namespace

# 3. 构建并部署
npm run build
npx wrangler pages deploy dist --project-name=tusi
```

> 注意：KV 绑定通过 Dashboard 管理，不在仓库中维护命名空间 ID。

---

## 🔐 后台密码

默认模式无需在部署前配置密码：首次访问 `/admin` 设置密码，SHA-256 哈希写入 KV。登录态保存在浏览器 `localStorage`，7 天后自动过期。

如需固定密码（例如多人协作或自动化），可在 Pages 项目中添加 Secret：

```txt
Settings → Variables and Secrets → Add
Variable name: ADMIN_TOKEN
Value: 一串高强度密码
```

设置 `ADMIN_TOKEN` 后，系统优先使用该 Secret，忽略 KV 中的首次设置密码。

---

## 使用流程

1. 打开 `/admin` 并登录
2. 点击 **新建项目**，填写英文 ID 和中文名（例如 ID = `blog`）
3. 进入项目详情页
4. 选择文件类型，填写文件名和内容，保存
5. 访问公开 URL

示例：

```txt
项目 ID: blog
文件类型: md
文件名:  post-1
公开地址: /blog/post-1.md
```

---

## 💾 数据备份

后台首页右上角有 **导出** / **导入** 按钮。

**导出**：把全部项目和文件下载为 JSON 备份，文件名形如 `tusi-backup-2026-05-23.json`。

**导入**：选择此前导出的 JSON 备份，提供三种模式：

| 模式              | 行为                                           |
| ----------------- | ---------------------------------------------- |
| 合并·跳过         | 同 ID 项目保持原样，仅导入新项目               |
| 合并·覆盖（推荐） | 同 ID 项目用备份内容覆盖，未在备份中的项目保留 |
| 替换              | 清空全部后导入（管理员密码保留）⚠ **不可恢复** |

> 替换模式会弹出二次确认。导入过程中无效项目/文件会被跳过并在结果中列出，不影响其他数据。

---

## 本地开发

### 启动前端（仅 UI，无 KV）

```bash
npm install
npm run dev
```

访问 <http://localhost:5173>。这种模式只跑 React，调用后端 API 会失败，适合纯 UI 调试。

### 联调 Functions 和模拟 KV

```bash
npm run build
npm run pages:dev
```

访问 <http://localhost:8788/admin>。Wrangler 会启动模拟 KV，首次访问设置的密码保存在本地，不影响生产数据。

### 常用脚本

| 命令                | 作用                                 |
| ------------------- | ------------------------------------ |
| `npm run lint`      | ESLint 检查                          |
| `npm run typecheck` | 双重 TS 类型检查（前端 + Functions） |
| `npm run build`     | 生产构建                             |
| `npm run deploy`    | 通过 Wrangler 直接部署到 Pages       |

---

## API

| 方法     | 路径                              | 鉴权 | 说明                     |
| -------- | --------------------------------- | ---- | ------------------------ |
| `GET`    | `/<projectId>/<filename>`         | 否   | 公开读取文件             |
| `GET`    | `/admin-api/auth-status`          | 否   | 查询是否需要首次设置密码 |
| `POST`   | `/admin-api/setup`                | 否   | 首次设置管理员密码       |
| `POST`   | `/admin-api/change-password`      | 是   | 修改管理员密码           |
| `GET`    | `/admin-api/projects`             | 是   | 获取项目列表             |
| `POST`   | `/admin-api/projects`             | 是   | 创建项目                 |
| `PUT`    | `/admin-api/projects/<id>`        | 是   | 修改项目名或项目 ID      |
| `DELETE` | `/admin-api/projects/<id>`        | 是   | 删除项目及其文件         |
| `GET`    | `/admin-api/files/<id>`           | 是   | 获取项目文件列表         |
| `POST`   | `/admin-api/files/<id>`           | 是   | 保存文件                 |
| `DELETE` | `/admin-api/files/<id>`           | 是   | 删除文件                 |
| `GET`    | `/admin-api/export`               | 是   | 导出全部项目和文件快照   |
| `POST`   | `/admin-api/import`               | 是   | 导入数据快照（三种模式） |

保存文件请求示例：

```json
{
  "filename": "config.json",
  "content": "{\"enabled\": true}"
}
```

---

## KV 数据结构

```txt
settings:admin_token_sha256  → 管理员密码 SHA-256 哈希
proj:<projectId>             → {"id":"blog","name":"博客","createdAt":...}
file:<projectId>:<filename>  → 文件内容
```

删除项目时会分页清理该项目下所有 `file:<projectId>:` 前缀的文件。

---

## 项目结构

```txt
.
├── functions/                          # Cloudflare Pages Functions
│   ├── admin-api/[[route]].ts          # 管理 API
│   ├── [projectId]/[filename].ts       # 公开文件读取
│   ├── _types.ts
│   └── _utils.ts
├── public/
│   ├── _routes.json                    # Pages Functions 路由分流
│   └── logo.svg
├── src/
│   ├── components/
│   ├── pages/
│   ├── api.ts
│   └── main.tsx
└── package.json
```

---

## 安全说明

- 管理员密码至少 8 位
- `ADMIN_TOKEN` 可选，建议作为 Secret 保存
- 公开读取接口无需鉴权，避免存放私密文件
- 项目 ID 仅允许小写字母、数字、下划线、连字符
- 文件名主体仅允许字母、数字、下划线、连字符
- 首次部署后请尽快打开 `/admin` 设置密码
