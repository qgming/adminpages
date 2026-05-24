// 管理后台首页：项目卡片列表 + 新建项目
import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Project } from '@/types'
import {
  listProjects,
  createProject,
  deleteProject,
  getToken,
  getAuthStatus,
  UnauthorizedError,
} from '@/api'
import { Button } from '@/components/ui/button'
import { TokenPrompt } from '@/components/token-prompt'
import { AdminShell } from '@/components/admin-shell'
import { ProjectList } from '@/components/project-list'
import { ProjectCreator } from '@/components/project-creator'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(() => !!getToken())
  const [creating, setCreating] = useState(false)
  const [tokenOpen, setTokenOpen] = useState(() => !getToken())
  const [setupRequired, setSetupRequired] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleUnauthorized = useCallback((setup = false) => {
    const msg = setup ? '请先设置管理员密码' : 'Token 无效或已过期，请重新输入'
    setSetupRequired(setup)
    setAuthError(msg)
    setTokenOpen(true)
    toast.error(msg)
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const { projects } = await listProjects()
      setProjects(Array.isArray(projects) ? projects : [])
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        handleUnauthorized(e.setupRequired)
      } else {
        toast.error(`加载失败: ${(e as Error).message}`)
      }
    } finally {
      setLoading(false)
    }
  }, [handleUnauthorized])

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

  const handleCreate = async (req: { id: string; name: string }) => {
    setCreating(true)
    try {
      await createProject(req)
      toast.success(`已创建项目 ${req.id}`)
      await loadList()
      return true
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        handleUnauthorized(e.setupRequired)
      } else {
        toast.error(`创建失败: ${(e as Error).message}`)
      }
      return false
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (project: Project) => {
    try {
      await deleteProject(project.id)
      toast.success(`已删除项目 ${project.id}`)
      await loadList()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        handleUnauthorized(e.setupRequired)
      } else {
        toast.error(`删除失败: ${(e as Error).message}`)
      }
    }
  }

  return (
    <AdminShell>
      <div className="px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">项目</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={loadList}
                disabled={loading}
                title="刷新"
                aria-label="刷新项目列表"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
              </Button>
              <ProjectCreator creating={creating} onCreate={handleCreate} />
            </div>
          </section>

          <ProjectList
            projects={projects}
            loading={loading}
            onDelete={handleDelete}
          />
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
