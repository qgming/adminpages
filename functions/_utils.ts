// Functions 公用工具：鉴权、校验、KV 键、JSON 响应
import type { Env, FileExt } from './_types'

// 校验 Bearer Token；通过返回 null，否则返回 401 Response
export function requireAuth(request: Request, env: Env): Response | null {
  const auth = request.headers.get('Authorization') ?? ''
  const expected = `Bearer ${env.ADMIN_TOKEN}`
  if (!env.ADMIN_TOKEN || auth !== expected) {
    return jsonResponse({ error: '未授权' }, 401)
  }
  return null
}

// 项目 ID：必须以小写字母或数字开头，仅允许小写字母、数字、下划线、连字符；长度 1~32
const PROJECT_ID_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/
// 保留字：会与系统路径冲突，禁止用作项目 ID
const RESERVED_IDS: ReadonlySet<string> = new Set([
  'admin',
  'admin-api',
  'assets',
  'api',
  'static',
  'public',
  'favicon.ico',
  '_routes',
  '_redirects',
  '_headers',
])
export function isValidProjectId(id: unknown): id is string {
  return (
    typeof id === 'string' && PROJECT_ID_RE.test(id) && !RESERVED_IDS.has(id)
  )
}

// 项目中文名：1~32 字符，去除前后空白后非空
export function isValidProjectName(name: unknown): name is string {
  if (typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= 32
}

// 文件名（含扩展名）：basename 仅允许字母、数字、下划线、连字符，1~64 位；扩展名必须是 json/md/html
const FILENAME_RE = /^([a-zA-Z0-9_-]{1,64})\.(json|md|html)$/
export function parseFilename(
  raw: unknown,
): { basename: string; ext: FileExt; full: string } | null {
  if (typeof raw !== 'string') return null
  const m = FILENAME_RE.exec(raw)
  if (!m) return null
  return { basename: m[1], ext: m[2] as FileExt, full: raw }
}

// 扩展名 → Content-Type 映射
export function contentTypeOf(ext: FileExt): string {
  if (ext === 'json') return 'application/json; charset=utf-8'
  if (ext === 'md') return 'text/markdown; charset=utf-8'
  return 'text/html; charset=utf-8'
}

// KV 键命名规则
//   proj:<id>           → JSON 字符串 { name, createdAt }
//   file:<id>:<filename> → 文件原始内容
export function projectKey(id: string): string {
  return `proj:${id}`
}
export function fileKey(projectId: string, filename: string): string {
  return `file:${projectId}:${filename}`
}
export function fileKeyPrefix(projectId: string): string {
  return `file:${projectId}:`
}

// 统一 JSON 响应
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
