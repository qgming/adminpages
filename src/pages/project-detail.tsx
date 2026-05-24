// 项目详情页：文件列表 + 新建/编辑器
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Files, RefreshCw } from 'lucide-react'
import type { FileItem, Project } from '@/types'
import {
  listFiles,
  saveFile,
  deleteFile,
  fetchPublicFile,
  getToken,
  getAuthStatus,
  UnauthorizedError,
} from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TokenPrompt } from '@/components/token-prompt'
import { AdminShell } from '@/components/admin-shell'
import { FileList } from '@/components/file-list'
import { FileEditor } from '@/components/file-editor'
import { ProjectInfoCard } from '@/components/project-info-card'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(() => !!getToken())
  const [saving, setSaving] = useState(false)
  const [tokenOpen, setTokenOpen] = useState(() => !getToken())
  const [setupRequired, setSetupRequired] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{
    item: FileItem
    content: string
  } | null>(null)

  const handleUnauthorized = useCallback((setup = false) => {
    const msg = setup ? '请先设置管理员密码' : 'Token 无效或已过期，请重新输入'
    setSetupRequired(setup)
    setAuthError(msg)
    setTokenOpen(true)
    toast.error(msg)
  }, [])

  const loadList = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { project, items } = await listFiles(projectId)
      setProject(project)
      setItems(Array.isArray(items) ? items : [])
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        handleUnauthorized(e.setupRequired)
      } else {
        toast.error(`加载失败: ${(e as Error).message}`)
      }
    } finally {
      setLoading(false)
    }
  }, [handleUnauthorized, projectId])

  useEffect(() => {
    if (getToken()) {
      const timer = window.setTimeout(() => {
        void loadList()
      }, 0)
      return () => window.clearTimeout(timer)
    }
    void getAuthStatus()
      .then(({ setupRequired }) => {
        setSetupRequired(setupRequired)
        setTokenOpen(true)
      })
      .catch(() => setTokenOpen(true))
  }, [loadList])

  const handleSave = async (req: { filename: string; content: string }) => {
    if (!projectId) return
    setSaving(true)
    try {
      await saveFile(projectId, req)
      toast.success(`已保存 /${projectId}/${req.filename}`)
      setEditing(null)
      await loadList()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        handleUnauthorized(e.setupRequired)
      } else {
        toast.error(`保存失败: ${(e as Error).message}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: FileItem) => {
    if (!projectId) return
    try {
      await deleteFile(projectId, { filename: item.filename })
      toast.success(`已删除 /${projectId}/${item.filename}`)
      if (editing && editing.item.filename === item.filename) {
        setEditing(null)
      }
      await loadList()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        handleUnauthorized(e.setupRequired)
      } else {
        toast.error(`删除失败: ${(e as Error).message}`)
      }
    }
  }

  // 编辑：从公开 URL 抓取最新内容
  const handleEdit = async (item: FileItem) => {
    try {
      const content = await fetchPublicFile(projectId, item.filename)
      setEditing({ item, content })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error(`读取内容失败: ${(e as Error).message}`)
    }
  }

  return (
    <AdminShell>
      <div className="px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
          {/* 返回按钮独立一行 */}
          <div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/admin')}
              title="返回项目列表"
              aria-label="返回项目列表"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* 项目信息卡片（可编辑名称与 ID）；project 还没加载时不渲染 */}
          {project && (
            <ProjectInfoCard
              project={project}
              onProjectUpdated={setProject}
              onUnauthorized={handleUnauthorized}
            />
          )}

          <FileEditor
            editing={editing}
            saving={saving}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Files className="h-5 w-5 text-primary" />
                {project ? `${project.name} 的文件` : '文件列表'}
                <Badge variant="secondary" aria-label={`文件数量 ${items.length}`}>
                  {items.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                点击公开 URL 可直接预览，点编辑按钮可修改内容。
              </CardDescription>
              <CardAction>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadList}
                  disabled={loading}
                  title="刷新"
                  aria-label="刷新文件列表"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FileList
                projectId={projectId}
                items={items}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <TokenPrompt
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        onConfirm={loadList}
        setupRequired={setupRequired}
        errorMessage={authError}
        onErrorDismiss={() => setAuthError(null)}
      />
      <Toaster richColors position="top-right" />
    </AdminShell>
  )
}
