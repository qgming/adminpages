// 文件列表：桌面表格、移动端卡片，支持编辑、删除和外链打开
import { Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { FileItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  projectId: string
  items: FileItem[]
  loading: boolean
  onEdit: (item: FileItem) => void
  onDelete: (item: FileItem) => void
}

function extOf(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i >= 0 ? filename.slice(i + 1) : ''
}

const EXT_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  json: 'default',
  md: 'secondary',
  html: 'outline',
}

export function FileList({
  projectId,
  items,
  loading,
  onEdit,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 py-10 text-center text-sm text-muted-foreground">
        加载中…
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 py-10 text-center text-sm text-muted-foreground">
        还没有文件，使用上方表单创建第一个吧。
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <FileMobileItem
            key={item.filename}
            projectId={projectId}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[100px] pl-4">类型</TableHead>
              <TableHead>文件名</TableHead>
              <TableHead>公开 URL</TableHead>
              <TableHead className="w-[180px] pr-4 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const ext = extOf(item.filename)
              const url = `/${projectId}/${item.filename}`
              return (
                <TableRow key={item.filename}>
                  <TableCell className="pl-4">
                    <Badge
                      variant={EXT_VARIANT[ext] ?? 'outline'}
                      className="uppercase"
                    >
                      {ext}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.filename}
                  </TableCell>
                  <TableCell>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {url}
                    </a>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="打开"
                        aria-label={`打开 ${url}`}
                        onClick={() => window.open(url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="编辑"
                        aria-label={`编辑 ${item.filename}`}
                        onClick={() => onEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteFileButton item={item} url={url} onDelete={onDelete} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function FileMobileItem({
  projectId,
  item,
  onEdit,
  onDelete,
}: {
  projectId: string
  item: FileItem
  onEdit: (item: FileItem) => void
  onDelete: (item: FileItem) => void
}) {
  const ext = extOf(item.filename)
  const url = `/${projectId}/${item.filename}`

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <Badge variant={EXT_VARIANT[ext] ?? 'outline'} className="uppercase">
            {ext}
          </Badge>
          <p className="break-all font-mono text-sm">{item.filename}</p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block break-all font-mono text-xs text-primary hover:underline"
          >
            {url}
          </a>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
          <ExternalLink className="mr-2 h-4 w-4" />
          打开
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
          <Pencil className="mr-2 h-4 w-4" />
          编辑
        </Button>
        <DeleteFileButton item={item} url={url} onDelete={onDelete} />
      </div>
    </div>
  )
}

function DeleteFileButton({
  item,
  url,
  onDelete,
}: {
  item: FileItem
  url: string
  onDelete: (item: FileItem) => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="删除"
          aria-label={`删除 ${item.filename}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4 md:mr-0" />
          <span className="md:sr-only">删除</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除？</AlertDialogTitle>
          <AlertDialogDescription>
            将永久删除文件 <span className="font-mono">{url}</span>，此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(item)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
