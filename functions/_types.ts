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

// 导出快照中单个项目的结构
export interface ExportedProject {
  id: string
  name: string
  createdAt: number
  files: { filename: string; content: string }[]
}

// 完整数据快照
export interface ExportSnapshot {
  version: 1
  exportedAt: number
  projects: ExportedProject[]
}

// 导入模式
//   skip    = 同 id 项目跳过
//   overwrite = 同 id 项目覆盖元信息与文件
//   replace = 先清空全部项目和文件，再写入（管理员密码保留）
export type ImportMode = 'skip' | 'overwrite' | 'replace'

export interface ImportRequest {
  data: ExportSnapshot
  mode: ImportMode
}

export interface ImportResult {
  imported: { projects: number; files: number }
  skipped: { projects: number; files: number }
  errors: string[]
}

// Cloudflare Pages 环境绑定
export interface Env {
  KV_BINDING: KVNamespace
  ADMIN_TOKEN?: string
}
