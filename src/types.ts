// 前端共享类型定义（与 functions/_types.ts 业务类型保持一致）
export type FileExt = 'json' | 'md' | 'html'

export interface Project {
  id: string
  name: string
  createdAt: number
}

export interface FileItem {
  filename: string // 含扩展名
}

export interface CreateProjectRequest {
  id: string
  name: string
}

export interface SaveFileRequest {
  filename: string
  content: string
}

export interface DeleteFileRequest {
  filename: string
}

// 导出快照中单个项目
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

export type ImportMode = 'skip' | 'overwrite' | 'replace'

export interface ImportResult {
  imported: { projects: number; files: number }
  skipped: { projects: number; files: number }
  errors: string[]
}
