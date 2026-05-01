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
- JSON 保存时自动校验并格式化
- 首次访问后台时设置管理员密码
- 管理员密码以 SHA-256 哈希保存到 KV
- 可选用 `ADMIN_TOKEN` Secret 覆盖首次设置密码模式
- Cloudflare Pages Functions 处理管理 API 和公开读取

## 技术栈

| 分类 | 技术                               |
| ---- | ---------------------------------- |
| 前端 | React 19、TypeScript 6、Vite 8     |
| 样式 | Tailwind CSS 4、shadcn/ui 源码组件 |
| 后端 | Cloudflare Pages Functions         |
| 存储 | Cloudflare Workers KV              |
| 部署 | Cloudflare Pages Git 集成          |

## 项目结构

```txt
.
├── functions/                         # Cloudflare Pages Functions
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

## 本地开发

安装依赖：

```bash
npm install
```

启动前端开发服务：

```bash
npm run dev
```

访问：

```txt
http://localhost:5173
```

常用检查：

```bash
npm run lint
npm run typecheck
npm run build
```

## 本地联调 Functions 和 KV

先构建前端：

```bash
npm run build
```

启动 Pages 本地环境：

```bash
npm run pages:dev
```

访问：

```txt
http://localhost:8788/admin
```

本地默认无需配置环境变量。首次打开 `/admin` 时设置管理员密码，密码会保存到本地模拟 KV。

## 部署配置

推荐使用 Cloudflare Pages Git 集成：

```txt
Workers & Pages → Create application → Pages → Connect to Git
```

构建配置：

```txt
Build command: npm run build
Build output directory: dist
Root directory: 项目根目录
Deploy command: 留空
```

Pages Git 集成会在构建成功后自动发布 `dist`。不要填写 `npx wrangler deploy`，那是普通 Workers 项目的部署命令。

## KV 配置

先在 Cloudflare 创建 KV namespace：

```txt
Workers & Pages → KV → Create namespace
Name: adminpages
```

创建后打开该 KV，复制 Cloudflare 显示的 `Namespace ID`，然后替换 [wrangler.jsonc](./wrangler.jsonc) 里的占位值：

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV_BINDING",
      "id": "填写 Namespace ID",
    },
  ],
}
```

注意：

- `binding` 必须是 `KV_BINDING`
- 代码读取的是 `env.KV_BINDING`
- `id` 必须是 Cloudflare 生成的 Namespace ID
- `id` 不能填 KV 名称 `adminpages`

## 后台密码

默认模式无需在部署前配置密码：

1. 部署完成后打开 `/admin`
2. 首次访问会显示“设置管理员密码”
3. 输入至少 8 位密码
4. 密码会以 SHA-256 哈希写入 KV
5. 后续使用该密码登录
6. 登录密码只保存在当前页面内存中，刷新页面后需要重新登录

如需固定密码，可以在 Pages 项目中添加 Secret：

```txt
Settings → Variables and Secrets → Add
Variable name: ADMIN_TOKEN
Value: 一串高强度密码
```

设置 `ADMIN_TOKEN` 后，系统优先使用该 Secret，不再使用 KV 中的首次设置密码。

## 使用流程

1. 打开 `/admin`
2. 首次访问时设置管理员密码
3. 创建项目，例如 `blog`
4. 进入项目详情页
5. 选择文件类型，填写文件名和内容
6. 保存后访问公开 URL

示例：

```txt
项目 ID: blog
文件类型: md
文件名: post-1
公开地址: /blog/post-1.md
```

## API

| 方法     | 路径                       | 鉴权 | 说明                     |
| -------- | -------------------------- | ---- | ------------------------ |
| `GET`    | `/<projectId>/<filename>`  | 否   | 公开读取文件             |
| `GET`    | `/admin-api/auth-status`   | 否   | 查询是否需要首次设置密码 |
| `POST`   | `/admin-api/setup`         | 否   | 首次设置管理员密码       |
| `GET`    | `/admin-api/projects`      | 是   | 获取项目列表             |
| `POST`   | `/admin-api/projects`      | 是   | 创建项目                 |
| `DELETE` | `/admin-api/projects/<id>` | 是   | 删除项目及其文件         |
| `GET`    | `/admin-api/files/<id>`    | 是   | 获取项目文件列表         |
| `POST`   | `/admin-api/files/<id>`    | 是   | 保存文件                 |
| `DELETE` | `/admin-api/files/<id>`    | 是   | 删除文件                 |

保存文件请求：

```json
{
  "filename": "config.json",
  "content": "{\"enabled\": true}"
}
```

## KV 数据结构

```txt
settings:admin_token_sha256  → 管理员密码 SHA-256 哈希
proj:<projectId>             → {"id":"blog","name":"博客","createdAt":...}
file:<projectId>:<filename>  → 文件内容
```

删除项目时会分页清理该项目下所有 `file:<projectId>:` 前缀的文件。

## 安全说明

- 管理员密码至少 8 位
- `ADMIN_TOKEN` 可选，建议作为 Secret 保存
- 公开读取接口无需鉴权，避免存放私密文件
- 项目 ID 仅允许小写字母、数字、下划线、连字符
- 文件名主体仅允许字母、数字、下划线、连字符
- 首次部署后尽快打开 `/admin` 设置密码
