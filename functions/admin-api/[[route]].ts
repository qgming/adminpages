// 管理 API（全部需要 Bearer Token 鉴权）
//
// 路由：
//   GET    /admin-api/projects           列出全部项目
//   POST   /admin-api/projects           创建项目（body: { id, name }）
//   PUT    /admin-api/projects/<id>      更新项目（body: { name?, newId? }）
//   DELETE /admin-api/projects/<id>      删除项目（连带其下所有文件）
//
//   GET    /admin-api/files/<id>         列出项目下的文件
//   POST   /admin-api/files/<id>         保存文件（body: { filename, content }）
//   DELETE /admin-api/files/<id>         删除文件（body: { filename }）
import type {
  CreateProjectRequest,
  DeleteFileRequest,
  Env,
  ExportSnapshot,
  ExportedProject,
  FileItem,
  ImportMode,
  ImportRequest,
  ImportResult,
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
  requireKvBinding,
  setupAdminToken,
  changeAdminPassword,
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
  const raw = await env.KV_BINDING.get(projectKey(id))
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as {
      name?: unknown
      createdAt?: unknown
    }
    if (typeof data.name === 'string' && typeof data.createdAt === 'number') {
      return {
        id,
        name: data.name,
        createdAt: data.createdAt,
      }
    }
  } catch {
    // 损坏数据：忽略
  }
  return null
}

// ===== projects =====

async function listProjects(env: Env): Promise<Response> {
  const result = await env.KV_BINDING.list({ prefix: 'proj:', limit: 1000 })
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
  const existing = await env.KV_BINDING.get(projectKey(id))
  if (existing) {
    return jsonResponse({ error: '项目 ID 已存在' }, 409)
  }

  const project: Project = {
    id,
    name: name.trim(),
    createdAt: Date.now(),
  }
  await env.KV_BINDING.put(projectKey(id), JSON.stringify(project))
  return jsonResponse({ ok: true, project })
}

// 更新项目：支持改名与改 ID
// 改 ID 的代价较大：需要把 file:<oldId>:* 全部迁移到 file:<newId>:*，再删除旧条目和旧 proj:<oldId>
// 失败语义：迁移失败时不回滚（KV 没有事务），但只要新 ID 校验通过且无冲突，重试是安全的
async function updateProject(
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

  let body: { name?: unknown; newId?: unknown }
  try {
    body = (await request.json()) as {
      name?: unknown
      newId?: unknown
    }
  } catch {
    return jsonResponse({ error: '请求体不是合法 JSON' }, 400)
  }

  // 解析新值；未传字段视为不变
  const nextName =
    typeof body.name === 'string' ? body.name.trim() : proj.name
  const nextId =
    typeof body.newId === 'string' ? body.newId.trim() : projectId

  if (!isValidProjectName(nextName)) {
    return jsonResponse({ error: '项目名称必须是 1-32 位非空字符' }, 400)
  }
  if (!isValidProjectId(nextId)) {
    return jsonResponse(
      {
        error:
          '项目 ID 只允许小写字母、数字、下划线、连字符（首字符必须是字母或数字，1-32 位），且不能是保留字',
      },
      400,
    )
  }

  // 仅改名：直接覆盖即可
  if (nextId === projectId) {
    if (nextName === proj.name) {
      return jsonResponse({ ok: true, project: proj })
    }
    const updated: Project = { ...proj, name: nextName }
    await env.KV_BINDING.put(projectKey(projectId), JSON.stringify(updated))
    return jsonResponse({ ok: true, project: updated })
  }

  // 改 ID：先校验新 ID 不存在
  const existing = await env.KV_BINDING.get(projectKey(nextId))
  if (existing) {
    return jsonResponse({ error: '目标项目 ID 已存在' }, 409)
  }

  // 迁移所有文件：读出旧 file:<oldId>:* 全部，按新键写入；旧键稍后清理
  // 注意：KV 没有原子事务，过程中失败会有部分新键写入但旧键还在的不一致；
  //       由于新键正确写入，且旧 proj 元信息此时未变，重试整个 update 仍是安全的
  const filesToMigrate: { newKey: string; oldKey: string; content: string }[] =
    []
  let cursor: string | undefined
  for (;;) {
    const page = await env.KV_BINDING.list({
      prefix: fileKeyPrefix(projectId),
      cursor,
      limit: 1000,
    })
    for (const key of page.keys) {
      const filename = key.name.slice(fileKeyPrefix(projectId).length)
      if (!filename) continue
      const content = await env.KV_BINDING.get(key.name)
      if (content === null) continue
      filesToMigrate.push({
        newKey: fileKey(nextId, filename),
        oldKey: key.name,
        content,
      })
    }
    if (page.list_complete) break
    cursor = page.cursor
  }

  // 写入新键
  await Promise.all(
    filesToMigrate.map((f) => env.KV_BINDING.put(f.newKey, f.content)),
  )

  // 写入新 proj 元数据
  const updated: Project = {
    id: nextId,
    name: nextName,
    createdAt: proj.createdAt,
  }
  await env.KV_BINDING.put(projectKey(nextId), JSON.stringify(updated))

  // 清理旧键（先文件后 proj 元数据；如果中途失败，下次仍能通过 listProjects 看到旧项目空壳，
  //   用户可以手动删除）
  await Promise.all(
    filesToMigrate.map((f) => env.KV_BINDING.delete(f.oldKey)),
  )
  await env.KV_BINDING.delete(projectKey(projectId))

  return jsonResponse({ ok: true, project: updated })
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
    const page = await env.KV_BINDING.list({
      prefix: fileKeyPrefix(id),
      cursor,
      limit: 1000,
    })
    await Promise.all(page.keys.map((k) => env.KV_BINDING.delete(k.name)))
    if (page.list_complete) break
    cursor = page.cursor
  }

  await env.KV_BINDING.delete(projectKey(id))
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
    const page = await env.KV_BINDING.list({
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

  await env.KV_BINDING.put(fileKey(projectId, parsed.full), toStore)
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
  await env.KV_BINDING.delete(fileKey(projectId, parsed.full))
  return jsonResponse({ ok: true })
}

// ===== export / import =====

// 导出全部数据：遍历所有项目及其文件，组装为快照
async function exportAll(env: Env): Promise<Response> {
  const projects: ExportedProject[] = []

  // 拉取所有 proj:* 键
  const projList = await env.KV_BINDING.list({ prefix: 'proj:', limit: 1000 })
  for (const key of projList.keys) {
    const id = key.name.slice('proj:'.length)
    if (!id) continue
    const proj = await readProject(env, id)
    if (!proj) continue

    // 拉取该项目下全部文件
    const files: { filename: string; content: string }[] = []
    let cursor: string | undefined
    for (;;) {
      const page = await env.KV_BINDING.list({
        prefix: fileKeyPrefix(id),
        cursor,
        limit: 1000,
      })
      for (const fileKeyEntry of page.keys) {
        const filename = fileKeyEntry.name.slice(fileKeyPrefix(id).length)
        if (!filename) continue
        const content = await env.KV_BINDING.get(fileKeyEntry.name)
        if (content !== null) files.push({ filename, content })
      }
      if (page.list_complete) break
      cursor = page.cursor
    }

    projects.push({
      id: proj.id,
      name: proj.name,
      createdAt: proj.createdAt,
      files,
    })
  }

  const snapshot: ExportSnapshot = {
    version: 1,
    exportedAt: Date.now(),
    projects,
  }
  return jsonResponse(snapshot)
}

// 按前缀清空 KV 中所有键
async function purgeByPrefix(env: Env, prefix: string): Promise<void> {
  let cursor: string | undefined
  for (;;) {
    const page = await env.KV_BINDING.list({ prefix, cursor, limit: 1000 })
    await Promise.all(page.keys.map((k) => env.KV_BINDING.delete(k.name)))
    if (page.list_complete) break
    cursor = page.cursor
  }
}

// 清空所有项目数据（保留管理员密码）
async function purgeAllData(env: Env): Promise<void> {
  await purgeByPrefix(env, 'file:')
  await purgeByPrefix(env, 'proj:')
}

function isValidMode(value: unknown): value is ImportMode {
  return value === 'skip' || value === 'overwrite' || value === 'replace'
}

// 导入数据
async function importAll(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: ImportRequest
  try {
    body = (await request.json()) as ImportRequest
  } catch {
    return jsonResponse({ error: '请求体不是合法 JSON' }, 400)
  }

  if (!body || typeof body !== 'object') {
    return jsonResponse({ error: '请求体格式错误' }, 400)
  }
  if (!isValidMode(body.mode)) {
    return jsonResponse({ error: '无效的导入模式' }, 400)
  }
  const data = body.data
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) {
    return jsonResponse({ error: '数据快照格式错误' }, 400)
  }
  if (data.version !== 1) {
    return jsonResponse({ error: `不支持的快照版本: ${String(data.version)}` }, 400)
  }

  const result: ImportResult = {
    imported: { projects: 0, files: 0 },
    skipped: { projects: 0, files: 0 },
    errors: [],
  }

  // 替换模式：先清空
  if (body.mode === 'replace') {
    await purgeAllData(env)
  }

  for (const exported of data.projects) {
    if (!exported || typeof exported !== 'object') {
      result.errors.push('跳过无效的项目条目')
      continue
    }
    const { id, name, createdAt, files } = exported

    if (!isValidProjectId(id)) {
      result.errors.push(`项目 ID 不合法: ${String(id)}`)
      continue
    }
    if (!isValidProjectName(name)) {
      result.errors.push(`项目 ${id} 名称不合法`)
      continue
    }

    // 冲突处理
    const existing = await env.KV_BINDING.get(projectKey(id))
    if (existing && body.mode === 'skip') {
      result.skipped.projects += 1
      // 计算被跳过的文件数（用于反馈）
      const filesArr = Array.isArray(files) ? files : []
      result.skipped.files += filesArr.length
      continue
    }

    const project: Project = {
      id,
      name: name.trim(),
      createdAt:
        typeof createdAt === 'number' && createdAt > 0
          ? createdAt
          : Date.now(),
    }
    await env.KV_BINDING.put(projectKey(id), JSON.stringify(project))
    result.imported.projects += 1

    // 写入文件
    const filesArr = Array.isArray(files) ? files : []
    for (const file of filesArr) {
      if (!file || typeof file !== 'object') {
        result.errors.push(`项目 ${id} 含无效文件条目`)
        continue
      }
      const parsed = parseFilename(file.filename)
      if (!parsed) {
        result.errors.push(`项目 ${id} 文件名不合法: ${String(file.filename)}`)
        continue
      }
      if (typeof file.content !== 'string') {
        result.errors.push(`项目 ${id} 文件 ${parsed.full} 内容非字符串`)
        continue
      }
      let toStore = file.content
      if (parsed.ext === 'json') {
        try {
          toStore = JSON.stringify(JSON.parse(file.content), null, 2)
        } catch {
          result.errors.push(`项目 ${id} 文件 ${parsed.full} JSON 格式无效`)
          continue
        }
      }
      await env.KV_BINDING.put(fileKey(id, parsed.full), toStore)
      result.imported.files += 1
    }
  }

  return jsonResponse({ ok: true, result })
}

// ===== entry =====

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env, params } = ctx
  const segments = getSegments(params.route)
  const method = request.method.toUpperCase()
  const [resource, idSegment] = segments

  if (resource === 'auth-status' && segments.length === 1 && method === 'GET') {
    const kvMissing = requireKvBinding(env)
    if (kvMissing) return kvMissing
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

  if (
    resource === 'change-password' &&
    segments.length === 1 &&
    method === 'POST'
  ) {
    let body: { oldPassword?: unknown; newPassword?: unknown }
    try {
      body = (await request.json()) as {
        oldPassword?: unknown
        newPassword?: unknown
      }
    } catch {
      return jsonResponse({ error: '请求体不是合法 JSON' }, 400)
    }
    return changeAdminPassword(env, body.oldPassword, body.newPassword)
  }

  if (resource === 'projects') {
    if (segments.length === 1 && method === 'GET') {
      return listProjects(env)
    }
    if (segments.length === 1 && method === 'POST') {
      return createProject(request, env)
    }
    if (segments.length === 2 && method === 'PUT') {
      return updateProject(request, env, idSegment)
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

  if (resource === 'export' && segments.length === 1 && method === 'GET') {
    return exportAll(env)
  }

  if (resource === 'import' && segments.length === 1 && method === 'POST') {
    return importAll(request, env)
  }

  return jsonResponse({ error: 'Not Found' }, 404)
}
