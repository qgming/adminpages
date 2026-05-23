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
  updateProjectCors,
  getToken,
  getAuthStatus,
  clearToken,
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
import { AdminHeader } from '@/components/admin-header'
import { FileList } from '@/components/file-list'
import { FileEditor } from '@/components/file-editor'
import { CorsSettings } from '@/components/cors-settings'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(() => !!getToken())
  const [saving, setSaving] = useState(false)
  const [savingCors, setSavingCors] = useState(false)
  const [tokenOpen, setTokenOpen] = useState(() => !getToken())
  const [setupRequired, setSetupRequired] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(() => !!getToken())
  const [editing, setEditing] = useState<{
    item: FileItem
    content: string
  } | null>(null)

  const handleUnauthorized = useCallback((setup = false) => {
    const msg = setup ? '请先设置管理员密码' : 'Token 无效或已过期，请重新输入'
    setSetupRequired(setup)
    setAuthError(msg)
    setTokenOpen(true)
    setLoggedIn(false)
    toast.error(msg)
  }, [])

  const handleLogout = useCallback(() => {
    clearToken()
    setProject(null)
    setItems([])
    setLoggedIn(false)
    setTokenOpen(true)
    setAuthError(null)
    toast.success('已登出')
    navigate('/admin')
  }, [navigate])

  const loadList = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { project, items } = await listFiles(projectId)
      setProject(project)
      setItems(Array.isArray(items) ? items : [])
      setLoggedIn(true)
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

  const handleSaveCors = async (cors: Project['cors']) => {
    if (!projectId) return
    setSavingCors(true)
    try {
      const { project } = await updateProjectCors(projectId, cors)
      setProject(project)
      toast.success(`已更新 ${projectId} 的跨域配置`)
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        handleUnauthorized(e.setupRequired)
      } else {
        toast.error(`保存跨域配置失败: ${(e as Error).message}`)
      }
    } finally {
      setSavingCors(false)
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

  const breadcrumbs = project
    ? [{ label: `${project.id}（${project.name}）` }]
    : [{ label: projectId }]

  return (
    <div className="min-h-dvh bg-background">
      <AdminHeader
        breadcrumbs={breadcrumbs}
        loggedIn={loggedIn}
        onLogout={handleLogout}
      />

      <main className="container max-w-6xl space-y-6 py-5 sm:space-y-8 sm:py-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回项目列表
          </Button>
        </div>

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

        {project && (
          <CorsSettings
            value={project.cors}
            saving={savingCors}
            onSave={handleSaveCors}
          />
        )}
      </main>

      <TokenPrompt
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        onConfirm={loadList}
        setupRequired={setupRequired}
        errorMessage={authError}
        onErrorDismiss={() => setAuthError(null)}
      />
      <Toaster richColors position="top-right" />
    </div>
  )
}
