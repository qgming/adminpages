# 菟丝动态文件托管

基于 React、TypeScript、Vite、Tailwind CSS 和 Cloudflare Pages Functions 的轻量文件托管后台。管理员可以创建项目，并在项目下维护 JSON、Markdown、HTML 文件；文件会保存到 Cloudflare Workers KV，并通过固定公开 URL 访问。

## 功能

- 管理后台：`/admin`
- 公开读取：`/<projectId>/<filename>`
- 支持文件类型：`.json`、`.md`、`.html`
- 管理接口使用 `ADMIN_TOKEN` 做 Bearer Token 鉴权
- 文件内容持久化到 KV 绑定 `DATA_KV`
- JSON 文件保存时会自动校验并格式化

## 技术栈

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- shadcn/ui 源码组件
- Cloudflare Pages Functions
- Cloudflare Workers KV

## 目录结构

```txt
.
├── functions/
│   ├── _types.ts
│   ├── _utils.ts
│   ├── [projectId]/[filename].ts
│   └── admin-api/[[route]].ts
├── public/
│   └── _routes.json
├── src/
│   ├── components/
│   ├── pages/
│   ├── api.ts
│   ├── App.tsx
│   └── main.tsx
├── .dev.vars.example
├── package.json
└── vite.config.ts
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

默认访问：

```txt
http://localhost:5173
```

常用检查命令：

```bash
npm run lint
npm run typecheck
npm run build
```

## 本地联调 Pages Functions 和 KV

复制本地环境变量模板：

```bash
cp .dev.vars.example .dev.vars
```

修改 `.dev.vars`：

```txt
ADMIN_TOKEN=your-local-secret-here
```

先构建前端：

```bash
npm run build
```

使用 Wrangler 启动 Pages 本地环境，并模拟 KV 绑定：

```bash
npm run pages:dev
```

访问后台：

```txt
http://localhost:8788/admin
```

登录时输入 `.dev.vars` 里的 `ADMIN_TOKEN`。

## 部署到 Cloudflare Pages

### 1. 创建 KV Namespace

进入 Cloudflare Dashboard：

```txt
Workers & Pages → KV → Create namespace
```

名称可以自定义，例如：

```txt
tusi-data
```

### 2. 创建 Pages 项目

进入：

```txt
Workers & Pages → Create application → Pages
```

连接 Git 仓库后填写构建配置：

```txt
Build command: npm run build
Build output directory: dist
Deploy command: npm run deploy
Root directory: 项目根目录
```

`npm run deploy` 会执行：

```bash
wrangler pages deploy dist --project-name=adminpages
```

Cloudflare Pages 项目名需要是 `adminpages`。如果你的 Pages 项目使用了其他名称，请同步修改 `package.json` 中的 `deploy` 脚本。

### 3. 绑定 KV

进入 Pages 项目设置：

```txt
Settings → Bindings → Add → KV namespace
```

填写：

```txt
Variable name: DATA_KV
KV namespace: 选择刚创建的 KV
```

`DATA_KV` 必须保持这个名字，后端函数会通过 `context.env.DATA_KV` 读取。

### 4. 设置后台登录密码

进入：

```txt
Settings → Variables and Secrets → Add
```

添加：

```txt
Variable name: ADMIN_TOKEN
Value: 一串高强度密码
```

建议作为 Secret 保存。`ADMIN_TOKEN` 是访问 `/admin` 时输入的后台登录密码。

### 5. 重新部署

添加 KV 绑定或环境变量后，需要重新部署一次。可以在 Pages 项目的部署页面点击重新部署，也可以 push 新提交触发自动部署。

部署完成后访问：

```txt
https://<your-project>.pages.dev/admin
```

## 使用流程

1. 打开 `/admin`
2. 输入 `ADMIN_TOKEN`
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
proj:<projectId>             → {"id":"blog","name":"博客","createdAt":...}
file:<projectId>:<filename>  → 文件内容
```

删除项目时会分页清理该项目下所有 `file:<projectId>:` 前缀的文件。

## 安全配置

- `ADMIN_TOKEN` 必须设置为高强度密码
- `ADMIN_TOKEN` 放在 Cloudflare Variables and Secrets 中
- `DATA_KV` 只保存项目和文件内容
- 公开读取接口无需鉴权，避免存放私密文件
- 项目 ID 仅允许小写字母、数字、下划线、连字符
- 文件名主体仅允许字母、数字、下划线、连字符

推荐生产配置：

```txt
ADMIN_TOKEN = 高强度后台密码
DATA_KV     = Cloudflare KV namespace binding
```
