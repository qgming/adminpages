// 管理 API 客户端：统一注入 Bearer Token，封装错误（特别是 401 重新弹 token 框）
import type {
  CreateProjectRequest,
  DeleteFileRequest,
  FileItem,
  Project,
  SaveFileRequest,
} from '@/types'

let adminToken: string | null = null

export function getToken(): string | null {
  return adminToken
}

export function setToken(token: string): void {
  adminToken = token
}

export function clearToken(): void {
  adminToken = null
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
