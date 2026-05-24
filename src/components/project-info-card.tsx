// 项目信息卡片：默认即编辑态
// - 名称与 ID 始终是输入框；保存按钮仅在内容变化且校验通过时启用
// - 改 ID 的副作用大，触发二次确认
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, FolderKanban } from 'lucide-react'
import { toast } from 'sonner'
import type { Project } from '@/types'
import { updateProject, UnauthorizedError } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  project: Project
  onProjectUpdated: (project: Project) => void
  onUnauthorized: (setupRequired: boolean) => void
}

export function ProjectInfoCard({
  project,
  onProjectUpdated,
  onUnauthorized,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderKanban className="h-5 w-5 text-primary" />
          项目信息
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectEditForm
          project={project}
          onSaved={onProjectUpdated}
          onUnauthorized={onUnauthorized}
        />
      </CardContent>
    </Card>
  )
}

interface FormProps {
  project: Project
  onSaved: (project: Project) => void
  onUnauthorized: (setupRequired: boolean) => void
}

function ProjectEditForm({ project, onSaved, onUnauthorized }: FormProps) {
  const navigate = useNavigate()
  const [name, setName] = useState(project.name)
  const [id, setId] = useState(project.id)
  const [submitting, setSubmitting] = useState(false)
  const [confirmIdChangeOpen, setConfirmIdChangeOpen] = useState(false)

  const nameTrimmed = name.trim()
  const idTrimmed = id.trim()
  const nameChanged = nameTrimmed !== project.name
  const idChanged = idTrimmed !== project.id
  const idValid = /^[a-z0-9][a-z0-9_-]{0,31}$/.test(idTrimmed)
  const nameValid = nameTrimmed.length > 0 && nameTrimmed.length <= 32
  const canSubmit =
    !submitting && (nameChanged || idChanged) && idValid && nameValid

  const doSave = async () => {
    setSubmitting(true)
    try {
      const { project: updated } = await updateProject(project.id, {
        name: nameTrimmed,
        newId: idChanged ? idTrimmed : undefined,
      })
      toast.success(idChanged ? '已更新项目，URL 已变更' : '已更新项目')
      onSaved(updated)
      // 改 ID 时同步本地输入框（防止 props 更新前显示旧值）
      setName(updated.name)
      setId(updated.id)
      // 改 ID 时替换路由路径
      if (idChanged) {
        navigate(`/admin/p/${encodeURIComponent(updated.id)}`, {
          replace: true,
        })
      }
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        onUnauthorized(e.setupRequired)
      } else {
        toast.error(`保存失败: ${(e as Error).message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (idChanged) {
      setConfirmIdChangeOpen(true)
      return
    }
    void doSave()
  }

  return (
    <>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="project-name" className="text-sm">
            项目名称
          </Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="项目名称（1-32 位）"
            maxLength={32}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-id" className="text-sm">
            项目 ID
          </Label>
          <Input
            id="project-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="小写字母/数字/下划线/连字符"
            maxLength={32}
            className="font-mono"
          />
          {idChanged && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                修改 ID 会变更所有文件的公开 URL，原有外部引用将失效。
              </span>
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </div>
      </form>

      <AlertDialog
        open={confirmIdChangeOpen}
        onOpenChange={setConfirmIdChangeOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>确认变更项目 ID？</AlertDialogTitle>
            <AlertDialogDescription>
              即将把 <span className="font-mono">{project.id}</span> 改为{' '}
              <span className="font-mono">{idTrimmed}</span>，所有文件会迁移到新地址，
              原有公开 URL 立即失效。此操作无法回滚。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmIdChangeOpen(false)
                void doSave()
              }}
            >
              我已了解，继续
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
