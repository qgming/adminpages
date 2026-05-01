// 管理 API（全部需要 Bearer Token 鉴权）
//
// 路由：
//   GET    /admin-api/projects           列出全部项目
//   POST   /admin-api/projects           创建项目（body: { id, name }）
//   DELETE /admin-api/projects/<id>      删除项目（连带其下所有文件）
//
//   GET    /admin-api/files/<id>         列出项目下的文件
//   POST   /admin-api/files/<id>         保存文件（body: { filename, content }）
//   DELETE /admin-api/files/<id>         删除文件（body: { filename }）
import type {
  CreateProjectRequest,
  DeleteFileRequest,
  Env,
  FileItem,
  Project,
  SaveFileRequest,
} from '../_types'
import {
  fileKey,
  fileKeyPrefix,
  isValidProjectId,
  isValidProjectName,
  isAdminSetupRequired,
  jsonResponse,
  parseFilename,
  projectKey,
  requireAuth,
  setupAdminToken,
} from '../_utils'

// 取出 [[route]] 的所有段
function getSegments(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

// 项目元信息读写
async function readProject(
  env: Env,
  id: string,
): Promise<Project | null> {
  const raw = await env.DATA_KV.get(projectKey(id))
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as { name?: unknown; createdAt?: unknown }
    if (typeof data.name === 'string' && typeof data.createdAt === 'number') {
      return { id, name: data.name, createdAt: data.createdAt }
    }
  } catch {
    // 损坏数据：忽略
  }
  return null
}

// ===== projects =====

async function listProjects(env: Env): Promise<Response> {
  const result = await env.DATA_KV.list({ prefix: 'proj:', limit: 1000 })
  const projects: Project[] = []
  for (const key of result.keys) {
    const id = key.name.slice('proj:'.length)
    if (!id) continue
    const proj = await readProject(env, id)
    if (proj) projects.push(proj)
  }
  // 按创建时间倒序
  projects.sort((a, b) => b.createdAt - a.createdAt)
  return jsonResponse({ projects })
}

async function createProject(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: CreateProjectRequest
  try {
    body = (await request.json()) as CreateProjectRequest
  } catch {
    return jsonResponse({ error: '请求体不是合法 JSON' }, 400)
  }
  const { id, name } = body
  if (!isValidProjectId(id)) {
    return jsonResponse(
      {
        error:
          '项目 ID 只允许小写字母、数字、下划线、连字符（首字符必须是字母或数字，1-32 位），且不能是保留字',
      },
      400,
    )
  }
  if (!isValidProjectName(name)) {
    return jsonResponse({ error: '项目名称必须是 1-32 位非空字符' }, 400)
  }

  // 已存在校验
  const existing = await env.DATA_KV.get(projectKey(id))
  if (existing) {
    return jsonResponse({ error: '项目 ID 已存在' }, 409)
  }

  const project: Project = {
    id,
    name: name.trim(),
    createdAt: Date.now(),
  }
  await env.DATA_KV.put(projectKey(id), JSON.stringify(project))
  return jsonResponse({ ok: true, project })
}

async function deleteProject(
  env: Env,
  id: string,
): Promise<Response> {
  if (!isValidProjectId(id)) {
    return jsonResponse({ error: '无效的项目 ID' }, 400)
  }

  // 级联删除项目下所有文件（KV 不支持原子批删，循环 delete）
  // 使用 cursor 分页处理超过 1000 个文件的极端场景
  let cursor: string | undefined
  for (;;) {
    const page = await env.DATA_KV.list({
      prefix: fileKeyPrefix(id),
      cursor,
      limit: 1000,
    })
    await Promise.all(page.keys.map((k) => env.DATA_KV.delete(k.name)))
    if (page.list_complete) break
    cursor = page.cursor
  }

  await env.DATA_KV.delete(projectKey(id))
  return jsonResponse({ ok: true })
}

// ===== files =====

async function listFiles(env: Env, projectId: string): Promise<Response> {
  if (!isValidProjectId(projectId)) {
    return jsonResponse({ error: '无效的项目 ID' }, 400)
  }
  const proj = await readProject(env, projectId)
  if (!proj) {
    return jsonResponse({ error: '项目不存在' }, 404)
  }

  const items: FileItem[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await env.DATA_KV.list({
      prefix: fileKeyPrefix(projectId),
      cursor,
      limit: 1000,
    })
    for (const key of page.keys) {
      const filename = key.name.slice(fileKeyPrefix(projectId).length)
      if (filename) items.push({ filename })
    }
    if (page.list_complete) break
    cursor = page.cursor
  }
  // 按文件名升序
  items.sort((a, b) => a.filename.localeCompare(b.filename))
  return jsonResponse({ project: proj, items })
}

async function saveFile(
  request: Request,
  env: Env,
  projectId: string,
): Promise<Response> {
  if (!isValidProjectId(projectId)) {
    return jsonResponse({ error: '无效的项目 ID' }, 400)
  }
  const proj = await readProject(env, projectId)
  if (!proj) {
    return jsonResponse({ error: '项目不存在' }, 404)
  }

  let body: SaveFileRequest
  try {
    body = (await request.json()) as SaveFileRequest
  } catch {
    return jsonResponse({ error: '请求体不是合法 JSON' }, 400)
  }
  const parsed = parseFilename(body.filename)
  if (!parsed) {
    return jsonResponse(
      {
        error:
          '文件名必须形如 <name>.<json|md|html>，name 仅允许字母、数字、下划线、连字符（1-64 位）',
      },
      400,
    )
  }
  if (typeof body.content !== 'string') {
    return jsonResponse({ error: 'content 必须是字符串' }, 400)
  }

  let toStore = body.content
  if (parsed.ext === 'json') {
    try {
      const parsedJson: unknown = JSON.parse(body.content)
      // 重新格式化为 2 空格缩进，便于阅读
      toStore = JSON.stringify(parsedJson, null, 2)
    } catch {
      return jsonResponse({ error: '无效的 JSON 格式' }, 400)
    }
  }

  await env.DATA_KV.put(fileKey(projectId, parsed.full), toStore)
  return jsonResponse({ ok: true, content: toStore })
}

async function deleteFile(
  request: Request,
  env: Env,
  projectId: string,
): Promise<Response> {
  if (!isValidProjectId(projectId)) {
    return jsonResponse({ error: '无效的项目 ID' }, 400)
  }
  let body: DeleteFileRequest
  try {
    body = (await request.json()) as DeleteFileRequest
  } catch {
    return jsonResponse({ error: '请求体不是合法 JSON' }, 400)
  }
  const parsed = parseFilename(body.filename)
  if (!parsed) {
    return jsonResponse({ error: '无效的文件名' }, 400)
  }
  await env.DATA_KV.delete(fileKey(projectId, parsed.full))
  return jsonResponse({ ok: true })
}

// ===== entry =====

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env, params } = ctx
  const segments = getSegments(params.route)
  const method = request.method.toUpperCase()
  const [resource, idSegment] = segments

  if (resource === 'auth-status' && segments.length === 1 && method === 'GET') {
    return jsonResponse({ setupRequired: await isAdminSetupRequired(env) })
  }

  if (resource === 'setup' && segments.length === 1 && method === 'POST') {
    let body: { token?: unknown }
    try {
      body = (await request.json()) as { token?: unknown }
    } catch {
      return jsonResponse({ error: '请求体不是合法 JSON' }, 400)
    }
    return setupAdminToken(env, body.token)
  }

  const unauthorized = await requireAuth(request, env)
  if (unauthorized) return unauthorized

  if (resource === 'projects') {
    if (segments.length === 1 && method === 'GET') {
      return listProjects(env)
    }
    if (segments.length === 1 && method === 'POST') {
      return createProject(request, env)
    }
    if (segments.length === 2 && method === 'DELETE') {
      return deleteProject(env, idSegment)
    }
  }

  if (resource === 'files' && segments.length === 2) {
    if (method === 'GET') return listFiles(env, idSegment)
    if (method === 'POST') return saveFile(request, env, idSegment)
    if (method === 'DELETE') return deleteFile(request, env, idSegment)
  }

  return jsonResponse({ error: 'Not Found' }, 404)
}
