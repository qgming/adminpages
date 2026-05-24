// 公开读取：/<projectId>/<filename>
// projectId 必须是已存在的项目；filename 必须含 .json/.md/.html 扩展名
//
// KV 消耗：每次访问仅 1 次 read（直接读文件，不再读项目元数据）
// CORS：全局允许所有源（allowAll）；如需收紧请改 GLOBAL_CORS_ALLOW_ALL
import type { Env } from '../_types'
import {
  contentTypeOf,
  fileKey,
  isValidProjectId,
  parseFilename,
  requireKvBinding,
} from '../_utils'

// 全局 CORS 配置：写死代码里，所有项目共享
// 改为 false 即关闭跨域；若需白名单，请改成接受 Origin 校验的实现
const GLOBAL_CORS_ALLOW_ALL = true

function applyJsonCorsHeaders(headers: Headers): void {
  if (!GLOBAL_CORS_ALLOW_ALL) return
  headers.set('Access-Control-Allow-Origin', '*')
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

// 解析参数；非法参数交给静态资源（next）兜底
async function resolveValidPath(
  ctx: EventContext<Env, string, unknown>,
): Promise<
  | {
      projectId: string
      parsed: { basename: string; ext: 'json' | 'md' | 'html'; full: string }
    }
  | Response
> {
  const { params, next } = ctx
  const { projectId, filename } = resolveParams(params)
  if (!isValidProjectId(projectId)) {
    return await next()
  }
  const parsed = parseFilename(filename)
  if (!parsed) {
    return await next()
  }
  return { projectId, parsed }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { env } = ctx
  const kvMissing = requireKvBinding(env)
  if (kvMissing) return kvMissing

  const resolved = await resolveValidPath(ctx)
  if (resolved instanceof Response) return resolved
  const { projectId, parsed } = resolved

  // 直接读文件：不存在 → 404（不再区分"项目不存在"和"文件不存在"）
  const content = await env.KV_BINDING.get(fileKey(projectId, parsed.full))
  if (content === null) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers({
    'Content-Type': contentTypeOf(parsed.ext),
    'Cache-Control': 'public, max-age=60',
  })
  if (parsed.ext === 'json') {
    applyJsonCorsHeaders(headers)
  }
  return new Response(content, { headers })
}

export const onRequestOptions: PagesFunction<Env> = async (ctx) => {
  const { env } = ctx
  const kvMissing = requireKvBinding(env)
  if (kvMissing) return kvMissing

  // OPTIONS 预检：完全不查 KV，用全局配置直接响应
  const resolved = await resolveValidPath(ctx)
  if (resolved instanceof Response) return resolved
  const { parsed } = resolved

  if (parsed.ext !== 'json') {
    return new Response(null, { status: 204 })
  }

  const headers = new Headers({ 'Cache-Control': 'public, max-age=60' })
  applyJsonCorsHeaders(headers)
  return new Response(null, { status: 204, headers })
}
