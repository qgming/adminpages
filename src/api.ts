// 管理 API 客户端：统一注入 Bearer Token，封装错误（特别是 401 重新弹 token 框）
import type {
  CreateProjectRequest,
  DeleteFileRequest,
  ExportSnapshot,
  FileItem,
  ImportMode,
  ImportResult,
  Project,
  ProjectCorsConfig,
  SaveFileRequest,
} from '@/types'

// Token 持久化：localStorage 存储 + 7 天过期
//   过期或不存在 → getToken() 返回 null，会触发登录弹窗
//   401 / 用户登出 → clearToken() 清空 storage
const TOKEN_STORAGE_KEY = 'tusi-admin-token'
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 天

interface StoredToken {
  token: string
  expiresAt: number
}

function readStoredToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<StoredToken>
    if (
      typeof data.token !== 'string' ||
      typeof data.expiresAt !== 'number' ||
      Date.now() > data.expiresAt
    ) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      return null
    }
    return data.token
  } catch {
    return null
  }
}

let adminToken: string | null = readStoredToken()

export function getToken(): string | null {
  return adminToken
}

export function setToken(token: string): void {
  adminToken = token
  if (typeof localStorage !== 'undefined') {
    const payload: StoredToken = {
      token,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    }
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // 私有模式或配额满时静默失败，至少内存还能用
    }
  }
}

export function clearToken(): void {
  adminToken = null
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      // 忽略
    }
  }
}

// 401 时抛出此错误，调用方需清 token 并重新弹 token 框
export class UnauthorizedError extends Error {
  setupRequired: boolean

  constructor(setupRequired = false) {
    super('未授权')
    this.name = 'UnauthorizedError'
    this.setupRequired = setupRequired
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, { ...init, headers })
  let data: unknown = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (res.status === 401) {
    const setupRequired =
      !!data &&
      typeof data === 'object' &&
      'setupRequired' in data &&
      Boolean((data as { setupRequired: unknown }).setupRequired)
    clearToken()
    throw new UnauthorizedError(setupRequired)
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : null) ?? `请求失败 (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

// ===== projects =====

export function listProjects(): Promise<{ projects: Project[] }> {
  return apiFetch<{ projects: Project[] }>('/admin-api/projects').then(
    (data) => ({
      projects: Array.isArray(data?.projects) ? data.projects : [],
    }),
  )
}

export function getAuthStatus(): Promise<{ setupRequired: boolean }> {
  return apiFetch<{ setupRequired: boolean }>('/admin-api/auth-status').then(
    (data) => ({ setupRequired: !!data.setupRequired }),
  )
}

export function setupAdminToken(token: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>('/admin-api/setup', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function createProject(
  req: CreateProjectRequest,
): Promise<{ ok: true; project: Project }> {
  return apiFetch<{ ok: true; project: Project }>('/admin-api/projects', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export function deleteProject(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/admin-api/projects/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export function updateProjectCors(
  projectId: string,
  cors: ProjectCorsConfig,
): Promise<{ ok: true; project: Project }> {
  return apiFetch<{ ok: true; project: Project }>(
    `/admin-api/project-cors/${encodeURIComponent(projectId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(cors),
    },
  )
}

// ===== files =====

export function listFiles(
  projectId: string,
): Promise<{ project: Project; items: FileItem[] }> {
  return apiFetch<{ project: Project; items: FileItem[] }>(
    `/admin-api/files/${encodeURIComponent(projectId)}`,
  ).then((data) => ({
    project: data.project,
    items: Array.isArray(data?.items) ? data.items : [],
  }))
}

export function saveFile(
  projectId: string,
  req: SaveFileRequest,
): Promise<{ ok: true; content: string }> {
  return apiFetch<{ ok: true; content: string }>(
    `/admin-api/files/${encodeURIComponent(projectId)}`,
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
  )
}

export function deleteFile(
  projectId: string,
  req: DeleteFileRequest,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/admin-api/files/${encodeURIComponent(projectId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify(req),
    },
  )
}

// 公开读取文件原文（无需鉴权）
export async function fetchPublicFile(
  projectId: string,
  filename: string,
): Promise<string> {
  const res = await fetch(
    `/${encodeURIComponent(projectId)}/${encodeURIComponent(filename)}`,
    { cache: 'no-store' },
  )
  return res.ok ? res.text() : ''
}

// ===== export / import =====

export function exportAll(): Promise<ExportSnapshot> {
  return apiFetch<ExportSnapshot>('/admin-api/export')
}

export function importAll(
  data: ExportSnapshot,
  mode: ImportMode,
): Promise<{ ok: true; result: ImportResult }> {
  return apiFetch<{ ok: true; result: ImportResult }>('/admin-api/import', {
    method: 'POST',
    body: JSON.stringify({ data, mode }),
  })
}
