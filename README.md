# 菟丝动态文件托管

基于 React、TypeScript、Vite、Tailwind CSS 和 Cloudflare Pages Functions 的轻量文件托管后台。管理员可以创建项目，并在项目下维护 JSON、Markdown、HTML 文件；文件内容保存到 Cloudflare Workers KV，通过固定公开 URL 访问。

## 功能

- 管理后台：`/admin`
- 公开读取：`/<projectId>/<filename>`
- 支持文件类型：`.json`、`.md`、`.html`
- KV 绑定名固定为 `KV_BINDING`
- 首次访问后台时设置管理员密码，密码哈希后保存到 KV
- 可选使用 `ADMIN_TOKEN` Secret 覆盖 KV 密码模式
- JSON 文件保存时自动校验并格式化

## 技术栈

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- shadcn/ui 源码组件
- Cloudflare Pages Functions
- Cloudflare Workers KV

## 仓库配置

Cloudflare 配置集中在 `wrangler.jsonc`：

```jsonc
{
  "name": "adminpages",
  "compatibility_date": "2026-05-01",
  "pages_build_output_dir": "dist",
  "kv_namespaces": [
    {
      "binding": "KV_BINDING",
      "id": "这里填你的 KV Namespace ID"
    }
  ]
}
```

这意味着 Pages 项目名、输出目录和 KV 绑定名已在仓库中固定。代码读取的 KV 绑定名固定为 `KV_BINDING`。

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

## 本地联调 Pages Functions 和 KV

构建前端：

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

默认无需配置本地环境变量。首次打开 `/admin` 时设置管理员密码，密码会保存到本地模拟 KV。

## 部署到 Cloudflare Pages

推荐使用 Pages Git 集成：

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

Pages Git 集成会在构建成功后自动发布 `dist`，无需填写 `wrangler deploy` 或 `wrangler pages deploy`。

如果控制台强制要求 Deploy command，说明当前入口大概率是 Workers 项目或自定义部署流程。请重新从 `Pages → Connect to Git` 创建项目。

## KV 配置

先创建 KV namespace：

```txt
Workers & Pages → KV → Create namespace
Name: adminpages
```

创建后打开这个 KV，复制 Cloudflare 显示的 `Namespace ID`，然后替换 `wrangler.jsonc` 中的占位值：

```jsonc
"kv_namespaces": [
  {
    "binding": "KV_BINDING",
    "id": "f9d86b697ca44edc886d5a47d3dfb8b9"
  }
]
```

`binding` 必须是 `KV_BINDING`，因为代码读取的是 `env.KV_BINDING`。`id` 必须是 Cloudflare 生成的 Namespace ID，不能填 KV 名称 `adminpages`。

## 后台密码

默认模式无需在部署前配置密码：

1. 部署完成后打开 `/admin`
2. 第一次访问会显示“设置管理员密码”
3. 输入至少 8 位密码
4. 密码会以 SHA-256 哈希写入 KV
5. 后续使用这个密码登录

可选固定密码模式：

```txt
Settings → Variables and Secrets → Add
Variable name: ADMIN_TOKEN
Value: 一串高强度密码
```

设置 `ADMIN_TOKEN` 后，系统优先使用该 Secret，不再使用 KV 中的首次设置密码。

## 使用流程

1. 打开 `/admin`
2. 首次访问设置管理员密码，之后直接输入密码登录
3. 点击“新建项目”，填写项目 ID 和项目名称
4. 进入项目详情页
5. 选择文件类型，填写文件名和内容
6. 保存后通过公开 URL 访问文件

示例：

```txt
项目 ID: blog
文件类型: md
文件名: post-1
公开地址: /blog/post-1.md
```

## API

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/<projectId>/<filename>` | 否 | 公开读取文件 |
| `GET` | `/admin-api/auth-status` | 否 | 查询是否需要首次设置密码 |
| `POST` | `/admin-api/setup` | 否 | 首次设置管理员密码 |
| `GET` | `/admin-api/projects` | 是 | 获取项目列表 |
| `POST` | `/admin-api/projects` | 是 | 创建项目 |
| `DELETE` | `/admin-api/projects/<id>` | 是 | 删除项目及其文件 |
| `GET` | `/admin-api/files/<id>` | 是 | 获取项目文件列表 |
| `POST` | `/admin-api/files/<id>` | 是 | 保存文件 |
| `DELETE` | `/admin-api/files/<id>` | 是 | 删除文件 |

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
