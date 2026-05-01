// 新建项目弹窗：英文 ID + 中文名
import { useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  creating: boolean
  onCreate: (req: { id: string; name: string }) => boolean | Promise<boolean>
}

const ID_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/

export function ProjectCreator({ creating, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState('')
  const [name, setName] = useState('')

  const idValid = ID_RE.test(id)
  const nameValid = name.trim().length > 0 && name.trim().length <= 32
  const canSubmit = !creating && idValid && nameValid

  const reset = () => {
    setId('')
    setName('')
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    const created = await onCreate({ id, name: name.trim() })
    if (created) {
      reset()
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FolderPlus className="mr-2 h-4 w-4" />
          新建项目
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            新建项目
          </DialogTitle>
          <DialogDescription>
            英文 ID 将作为公开访问路径段，例如 ID 为 <code>blog</code> 时，
            文件可通过 <code>/blog/&lt;filename&gt;</code> 访问。
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="proj-id">项目 ID（英文）</Label>
            <Input
              id="proj-id"
              placeholder="例如 blog / docs / api"
              value={id}
              onChange={(e) => setId(e.target.value.toLowerCase())}
              aria-invalid={id.length > 0 && !idValid}
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {id.length > 0 && !idValid && (
              <p className="text-xs text-destructive">
                只允许小写字母、数字、下划线、连字符（首字符必须是字母或数字，1-32 位）
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-name">项目名称（中文）</Label>
            <Input
              id="proj-name"
              placeholder="例如 我的博客"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={name.length > 0 && !nameValid}
              autoComplete="off"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {creating ? '创建中…' : '创建项目'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
