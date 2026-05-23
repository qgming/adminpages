// 项目列表卡片：信息区 + 底部按钮组（打开 / 删除）
import { Link } from 'react-router-dom'
import { CalendarClock, FolderOpen, X } from 'lucide-react'
import type { Project } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  projects: Project[]
  loading: boolean
  onDelete: (project: Project) => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function ProjectList({ projects, loading, onDelete }: Props) {
  if (loading) {
    return <ProjectListNotice text="加载中…" />
  }
  if (projects.length === 0) {
    return <ProjectListNotice text="还没有项目，点击右上角新建第一个项目。" />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onDelete={onDelete} />
      ))}
    </div>
  )
}

function ProjectListNotice({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project
  onDelete: (project: Project) => void
}) {
  const href = `/admin/p/${encodeURIComponent(project.id)}`

  return (
    <Card className="relative flex flex-col gap-0 p-0 transition-colors hover:ring-primary/40">
      {/* 右上角删除按钮 */}
      <div className="absolute right-3 top-3 z-10">
        <DeleteProjectButton project={project} onDelete={onDelete} />
      </div>

      {/* 信息区 */}
      <div className="flex flex-col gap-4 px-5 pt-5 pr-14">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="truncate text-base font-semibold leading-tight">
              {project.name}
            </h2>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              /{project.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>{formatDate(project.createdAt)}</span>
        </div>
      </div>

      {/* 底部"打开"按钮 */}
      <div className="mt-4 border-t border-border/60 px-5 py-3">
        <Button variant="outline" asChild className="w-full">
          <Link to={href}>
            <FolderOpen className="mr-2 h-4 w-4" />
            打开
          </Link>
        </Button>
      </div>
    </Card>
  )
}

function DeleteProjectButton({
  project,
  onDelete,
}: {
  project: Project
  onDelete: (project: Project) => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="删除"
          aria-label={`删除项目 ${project.id}`}
          className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
          <AlertDialogDescription>
            将永久删除项目 <span className="font-mono">{project.id}</span>（
            {project.name}）及其下的<strong>全部文件</strong>，此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(project)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
