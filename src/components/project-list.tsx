// 项目列表卡片：支持进入详情和删除确认
import { Link } from 'react-router-dom'
import { CalendarClock, FolderOpen, Trash2 } from 'lucide-react'
import type { Project } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ProjectList({ projects, loading, onDelete }: Props) {
  if (loading) {
    return <ProjectListNotice text="加载中…" />
  }
  if (projects.length === 0) {
    return <ProjectListNotice text="还没有项目，点击右上角新建第一个项目。" />
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onDelete={onDelete} />
      ))}
    </div>
  )
}

function ProjectListNotice({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
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
    <Card className="relative min-h-44 transition-colors hover:border-primary/40 hover:bg-muted/20">
      <DeleteProjectButton
        project={project}
        onDelete={onDelete}
        buttonClassName="absolute right-3 top-3"
      />
      <CardContent className="flex h-full flex-col gap-5 pr-14">
        <div className="min-w-0 space-y-3">
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
          <div className="flex items-center gap-2 rounded-lg bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDate(project.createdAt)}</span>
          </div>
        </div>

        <div className="mt-auto">
          <Button className="w-full" asChild>
            <Link to={href}>
              <FolderOpen className="mr-2 h-4 w-4" />
              进入
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DeleteProjectButton({
  project,
  onDelete,
  buttonClassName,
}: {
  project: Project
  onDelete: (project: Project) => void
  buttonClassName?: string
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="删除"
          aria-label={`删除项目 ${project.id}`}
          className={`text-destructive hover:text-destructive ${buttonClassName ?? ''}`}
        >
          <Trash2 className="h-4 w-4" />
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
