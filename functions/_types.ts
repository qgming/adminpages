// Cloudflare Pages Functions 共享类型定义
// 同样的业务类型在 src/types.ts 也有一份（前后端独立打包，避免路径别名）

// 文件扩展名（决定返回的 Content-Type）
export type FileExt = 'json' | 'md' | 'html'

// 项目元信息
export interface Project {
  id: string // 英文 ID（路径段）
  name: string // 中文显示名
  createdAt: number // 创建时间戳（毫秒）
}

// 项目下的单个文件
export interface FileItem {
  filename: string // 含扩展名，如 post.md / config.json / index.html
}

// 创建项目请求
export interface CreateProjectRequest {
  id: string
  name: string
}

// 保存文件请求
export interface SaveFileRequest {
  filename: string // 含扩展名
  content: string
}

// 删除文件请求
export interface DeleteFileRequest {
  filename: string
}

// Cloudflare Pages 环境绑定
export interface Env {
  KV_BINDING: KVNamespace
  ADMIN_TOKEN?: string
}
