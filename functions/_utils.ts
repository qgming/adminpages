// Functions 公用工具：鉴权、校验、KV 键、JSON 响应
import type { Env, FileExt } from './_types'

const ADMIN_TOKEN_HASH_KEY = 'settings:admin_token_sha256'
const MIN_ADMIN_TOKEN_LENGTH = 8
const KV_BINDING_ERROR =
  'KV_BINDING 未绑定。请在 Cloudflare Pages → Settings → Bindings 中添加名为 KV_BINDING 的 KV 命名空间绑定，然后重新部署一次。'

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function equalText(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function isAdminSetupRequired(env: Env): Promise<boolean> {
  if (env.ADMIN_TOKEN) return false
  if (!env.KV_BINDING) return true
  return !(await env.KV_BINDING.get(ADMIN_TOKEN_HASH_KEY))
}

export function requireKvBinding(env: Env): Response | null {
  return env.KV_BINDING
    ? null
    : jsonResponse({ error: KV_BINDING_ERROR }, 500)
}

export async function setupAdminToken(
  env: Env,
  token: unknown,
): Promise<Response> {
  if (env.ADMIN_TOKEN) {
    return jsonResponse({ error: '已通过环境变量配置管理员密码' }, 409)
  }
  if (typeof token !== 'string' || token.trim().length < MIN_ADMIN_TOKEN_LENGTH) {
    return jsonResponse({ error: '管理员密码至少需要 8 位' }, 400)
  }
  const kvMissing = requireKvBinding(env)
  if (kvMissing) return kvMissing
  if (!(await isAdminSetupRequired(env))) {
    return jsonResponse({ error: '管理员密码已设置' }, 409)
  }
  await env.KV_BINDING.put(ADMIN_TOKEN_HASH_KEY, await sha256Hex(token.trim()))
  return jsonResponse({ ok: true })
}

// 校验 Bearer Token；通过返回 null，否则返回 401 Response
export async function requireAuth(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  if (env.ADMIN_TOKEN) {
    return auth === `Bearer ${env.ADMIN_TOKEN}`
      ? null
      : jsonResponse({ error: '未授权' }, 401)
  }
  const kvMissing = requireKvBinding(env)
  if (kvMissing) return kvMissing
  const storedHash = await env.KV_BINDING.get(ADMIN_TOKEN_HASH_KEY)
  if (!storedHash) {
    return jsonResponse({ error: '需要先设置管理员密码', setupRequired: true }, 401)
  }
  const tokenHash = token ? await sha256Hex(token) : ''
  return equalText(tokenHash, storedHash)
    ? null
    : jsonResponse({ error: '未授权' }, 401)
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
