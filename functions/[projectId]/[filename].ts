// 公开读取：/<projectId>/<filename>
// projectId 必须是已存在的项目；filename 必须含 .json/.md/.html 扩展名
import type { Env, ProjectCorsConfig } from '../_types'
import {
  contentTypeOf,
  fileKey,
  isValidProjectId,
  parseFilename,
  projectKey,
  requireKvBinding,
} from '../_utils'

const DEFAULT_CORS_CONFIG: ProjectCorsConfig = {
  enabled: true,
  allowAll: true,
  origins: [],
}

function readProjectCors(rawProject: string): ProjectCorsConfig {
  try {
    const parsed = JSON.parse(rawProject) as { cors?: Partial<ProjectCorsConfig> }
    const cors = parsed.cors
    if (!cors || typeof cors !== 'object') return { ...DEFAULT_CORS_CONFIG }
    return {
      enabled: typeof cors.enabled === 'boolean' ? cors.enabled : true,
      allowAll: typeof cors.allowAll === 'boolean' ? cors.allowAll : true,
      origins: Array.isArray(cors.origins)
        ? cors.origins.filter((item): item is string => typeof item === 'string')
        : [],
    }
  } catch {
    return { ...DEFAULT_CORS_CONFIG }
  }
}

function isOriginAllowed(origin: string | null, cors: ProjectCorsConfig): boolean {
  if (!cors.enabled) return false
  if (cors.allowAll) return true
  if (!origin) return false
  return cors.origins.includes(origin)
}

function applyJsonCorsHeaders(
  headers: Headers,
  request: Request,
  cors: ProjectCorsConfig,
): void {
  if (!cors.enabled) return

  const origin = request.headers.get('Origin')
  if (cors.allowAll) {
    headers.set('Access-Control-Allow-Origin', '*')
    headers.delete('Vary')
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
    return
  }

  headers.set('Vary', 'Origin')
  if (isOriginAllowed(origin, cors)) {
    headers.set('Access-Control-Allow-Origin', origin!)
  } else {
    return
  }

  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
}

function resolveParams(params: Record<string, string | string[] | undefined>): {
  projectId: string | undefined
  filename: string | undefined
} {
  const rawId = params.projectId
  const rawFilename = params.filename
  return {
    projectId: Array.isArray(rawId) ? rawId[0] : rawId,
    filename: Array.isArray(rawFilename) ? rawFilename[0] : rawFilename,
  }
}

async function loadProjectContext(ctx: EventContext<Env, string, unknown>): Promise<{
  projectId: string
  parsed: { basename: string; ext: 'json' | 'md' | 'html'; full: string }
  projectMeta: string
} | Response> {
  const { env, params, next } = ctx

  const { projectId, filename } = resolveParams(params)
  if (!isValidProjectId(projectId)) {
    return next()
  }

  const parsed = parseFilename(filename)
  if (!parsed) {
    return next()
  }

  const projectMeta = await env.KV_BINDING.get(projectKey(projectId))
  if (!projectMeta) {
    return new Response('Not Found', { status: 404 })
  }

  return { projectId, parsed, projectMeta }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { env } = ctx
  const kvMissing = requireKvBinding(env)
  if (kvMissing) return kvMissing
  const loaded = await loadProjectContext(ctx)
  if (loaded instanceof Response) return loaded
  const { projectId, parsed, projectMeta } = loaded

  // 读取文件内容
  const content = await env.KV_BINDING.get(fileKey(projectId, parsed.full))
  if (content === null) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers({
    'Content-Type': contentTypeOf(parsed.ext),
    'Cache-Control': 'public, max-age=60',
  })

  if (parsed.ext === 'json') {
    applyJsonCorsHeaders(headers, ctx.request, readProjectCors(projectMeta))
  }

  return new Response(content, {
    headers,
  })
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) => {
  const { env } = ctx
  const kvMissing = requireKvBinding(env)
  if (kvMissing) return kvMissing

  const loaded = await loadProjectContext(ctx)
  if (loaded instanceof Response) return loaded
  const { parsed, projectMeta } = loaded
  if (parsed.ext !== 'json') {
    return new Response(null, { status: 204 })
  }

  const headers = new Headers({ 'Cache-Control': 'public, max-age=60' })
  applyJsonCorsHeaders(headers, ctx.request, readProjectCors(projectMeta))
  return new Response(null, { status: 204, headers })
}
