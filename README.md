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
- 项目级 JSON 跨域配置，支持总开关和 Origin 白名单
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

## 部署指南

使用 Cloudflare Pages 的 Git 集成，全程 **5 步**，无需修改任何代码。

### 步骤 1 — Fork 仓库到你的 GitHub

打开本仓库，点击右上角 `Fork` 按钮，把仓库 fork 到你的账号下。

### 步骤 2 — 在 Cloudflare 连接 Git 仓库

```txt
Workers & Pages → Create application → Pages → Connect to Git
→ 选择你 fork 的仓库 → Begin setup
```

### 步骤 3 — 填写构建配置

| 字段                     | 值              |
| ------------------------ | --------------- |
| Build command            | `npm run build` |
| Build output directory   | `dist`          |
| Root directory           | 留空（仓库根）  |
| Deploy command           | 留空            |

> ⚠ 不要填 `npx wrangler deploy`，那是普通 Workers 项目的部署命令。

点击 `Save and Deploy`，等待首次构建完成（KV 还没绑定，访问 `/admin` 会报错，正常）。

### 步骤 4 — 创建并绑定 KV 命名空间

**A. 创建 KV 命名空间**

```txt
Workers & Pages → KV → Create namespace
Name: adminpages（名字随意）
```

**B. 绑定到 Pages 项目**

进入你刚才部署的 Pages 项目：

```txt
Settings → Bindings → Add → KV namespace
```

| 字段           | 值                                      |
| -------------- | --------------------------------------- |
| Variable name  | `KV_BINDING` ← **必须用这个名字**       |
| KV namespace   | 选择上一步创建的 `adminpages`           |

> 代码读取的是 `env.KV_BINDING`，Variable name 写错就读不到 KV。

### 步骤 5 — 重新部署并设置密码

**A. 触发重新部署**（新增绑定后必须重部署才生效）

```txt
Deployments → 最新部署右侧 ⋯ → Retry deployment
```

也可以推送任意 commit 触发自动部署。

**B. 设置管理员密码**

部署成功后打开：

```txt
https://你的域名/admin
```

按提示设置至少 8 位的管理员密码即可登录使用。

> 如果 `/admin` 显示「KV_BINDING 未绑定」，回到步骤 4 检查 Variable name 是否拼写正确，并确认已重新部署。

---

## 后台密码

默认模式无需在部署前配置密码：首次访问 `/admin` 设置密码，SHA-256 哈希写入 KV。登录态只保存在当前页面内存中，刷新后需重新输入。

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
2. 点击 `新建项目`，填写英文 ID 和中文名（例如 ID = `blog`）
3. 进入项目详情页
4. 选择文件类型，填写文件名和内容，保存
5. 按需调整该项目的 JSON 跨域配置
6. 访问公开 URL

示例：

```txt
项目 ID: blog
文件类型: md
文件名:  post-1
公开地址: /blog/post-1.md
```

---

## 数据备份

后台首页右上角有 **导出** / **导入** 按钮。

**导出**：把全部项目和文件下载为 JSON 备份，文件名形如 `tusi-backup-2026-05-23.json`。

**导入**：选择此前导出的 JSON 备份，提供三种模式：

| 模式           | 行为                                                |
| -------------- | --------------------------------------------------- |
| 合并·跳过      | 同 ID 项目保持原样，仅导入新项目                    |
| 合并·覆盖（推荐） | 同 ID 项目用备份内容覆盖，未在备份中的项目保留     |
| 替换           | 清空全部后导入（管理员密码保留）⚠ **不可恢复**     |

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

| 命令                | 作用            |
| ------------------- | --------------- |
| `npm run lint`      | ESLint 检查     |
| `npm run typecheck` | 双重 TS 类型检查 |
| `npm run build`     | 生产构建        |

---

## API

| 方法     | 路径                            | 鉴权 | 说明                       |
| -------- | ------------------------------- | ---- | -------------------------- |
| `GET`    | `/<projectId>/<filename>`       | 否   | 公开读取文件               |
| `GET`    | `/admin-api/auth-status`        | 否   | 查询是否需要首次设置密码   |
| `POST`   | `/admin-api/setup`              | 否   | 首次设置管理员密码         |
| `GET`    | `/admin-api/projects`           | 是   | 获取项目列表               |
| `POST`   | `/admin-api/projects`           | 是   | 创建项目                   |
| `DELETE` | `/admin-api/projects/<id>`      | 是   | 删除项目及其文件           |
| `PUT`    | `/admin-api/project-cors/<id>`  | 是   | 更新项目 JSON 跨域配置     |
| `GET`    | `/admin-api/files/<id>`         | 是   | 获取项目文件列表           |
| `POST`   | `/admin-api/files/<id>`         | 是   | 保存文件                   |
| `DELETE` | `/admin-api/files/<id>`         | 是   | 删除文件                   |
| `GET`    | `/admin-api/export`             | 是   | 导出全部项目和文件快照     |
| `POST`   | `/admin-api/import`             | 是   | 导入数据快照（三种模式）   |

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
proj:<projectId>             → {"id":"blog","name":"博客","createdAt":...,"cors":{...}}
file:<projectId>:<filename>  → 文件内容
```

删除项目时会分页清理该项目下所有 `file:<projectId>:` 前缀的文件。

---

## JSON 跨域

- 项目创建后默认开启 JSON 跨域
- 默认允许所有来源访问该项目下的 `*.json`
- 可在项目详情页关闭跨域，或改成 Origin 白名单
- 跨域响应头仅作用于 `.json` 文件，不影响 `.md` 和 `.html`

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
├── wrangler.jsonc                      # Cloudflare Pages 配置
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
