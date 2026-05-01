// 公开读取：/<projectId>/<filename>
// projectId 必须是已存在的项目；filename 必须含 .json/.md/.html 扩展名
import type { Env } from '../_types'
import {
  contentTypeOf,
  fileKey,
  isValidProjectId,
  parseFilename,
  projectKey,
} from '../_utils'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { env, params, next } = ctx

  // 校验 projectId
  const rawId = params.projectId
  const projectId = Array.isArray(rawId) ? rawId[0] : rawId
  if (!isValidProjectId(projectId)) {
    // 形如 /assets/* 这类静态资源会被 _routes.json 排除掉，理论上不会到这里。
    // 仍然兜底一下：让请求继续走 Pages 静态资源
    return next()
  }

  // 校验文件名（必须含 .json/.md/.html 扩展名）。
  // 不匹配则认为该路径不属于本 Function 的责任范围（可能是 SPA 路由
  // 或静态资源），交给 Pages 静态层处理
  const rawFilename = params.filename
  const filenameStr = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename
  const parsed = parseFilename(filenameStr)
  if (!parsed) {
    return next()
  }

  // 项目必须存在；不存在时直接 404（避免泄漏存在性的同时给出明确状态码）
  const projectMeta = await env.DATA_KV.get(projectKey(projectId))
  if (!projectMeta) {
    return new Response('Not Found', { status: 404 })
  }

  // 读取文件内容
  const content = await env.DATA_KV.get(fileKey(projectId, parsed.full))
  if (content === null) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(content, {
    headers: {
      'Content-Type': contentTypeOf(parsed.ext),
      'Cache-Control': 'public, max-age=60',
    },
  })
}
