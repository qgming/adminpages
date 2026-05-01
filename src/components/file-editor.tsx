// 新建 / 编辑文件表单：选择类型、填写文件名和内容
import { useState } from 'react'
import { Save, X, FilePlus2, FileEdit } from 'lucide-react'
import type { FileItem } from '@/types'
import type { FileExt } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  // 编辑模式：传入需编辑的文件 + 当前内容；新建模式：传 null
  editing: { item: FileItem; content: string } | null
  saving: boolean
  onSave: (req: { filename: string; content: string }) => void
  onCancel: () => void
}

const BASENAME_RE = /^[a-zA-Z0-9_-]{1,64}$/
const DEFAULT_FILE_EXT: FileExt = 'json'
const FILE_EXT_OPTIONS: FileExt[] = ['json', 'md', 'html']

function splitFilename(filename: string): { basename: string; ext: FileExt } {
  const match = /^([a-zA-Z0-9_-]{1,64})\.(json|md|html)$/.exec(filename)
  if (!match) return { basename: filename, ext: DEFAULT_FILE_EXT }
  return { basename: match[1], ext: match[2] as FileExt }
}

export function FileEditor({ editing, saving, onSave, onCancel }: Props) {
  const formKey = editing?.item.filename ?? 'new'
  const initialFilename = editing?.item.filename ?? ''
  const initialContent = editing?.content ?? ''

  return (
    <FileEditorForm
      key={formKey}
      initialFilename={initialFilename}
      initialContent={initialContent}
      isEditMode={editing !== null}
      saving={saving}
      onSave={onSave}
      onCancel={onCancel}
    />
  )
}

interface FormProps {
  initialFilename: string
  initialContent: string
  isEditMode: boolean
  saving: boolean
  onSave: Props['onSave']
  onCancel: Props['onCancel']
}

function FileEditorForm({
  initialFilename,
  initialContent,
  isEditMode,
  saving,
  onSave,
  onCancel,
}: FormProps) {
  const initialFile = splitFilename(initialFilename)
  const [basename, setBasename] = useState(initialFile.basename)
  const [fileExt, setFileExt] = useState<FileExt>(initialFile.ext)
  const [content, setContent] = useState(initialContent)
  const filename = `${basename}.${fileExt}`
  const basenameValid = BASENAME_RE.test(basename)
  const canSave = !saving && basenameValid && content.length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({ filename, content })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <FileEdit className="h-5 w-5 text-primary" />
              编辑文件
            </>
          ) : (
            <>
              <FilePlus2 className="h-5 w-5 text-primary" />
              新建文件
            </>
          )}
        </CardTitle>
        <CardDescription>
          文件名需包含扩展名，仅支持 <code>.json</code> / <code>.md</code> /{' '}
          <code>.html</code>。JSON 内容将自动校验并以 2 空格缩进格式化保存。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <div className="space-y-2">
              <Label htmlFor="file-type">类型</Label>
              <Select
                value={fileExt}
                onValueChange={(value) => setFileExt(value as FileExt)}
                disabled={isEditMode}
              >
                <SelectTrigger
                  id="file-type"
                  className="h-10 w-full sm:h-8"
                  aria-label="文件类型"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_EXT_OPTIONS.map((ext) => (
                    <SelectItem key={ext} value={ext}>
                      .{ext}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="file-name">文件名</Label>
              <Input
                id="file-name"
                placeholder="例如 config / readme / index"
                value={basename}
                onChange={(e) => setBasename(e.target.value)}
                disabled={isEditMode}
                aria-invalid={basename.length > 0 && !basenameValid}
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
              />
            </div>
          </div>
          <p className="break-all text-xs text-muted-foreground">
            完整路径名：<code>{filename}</code>
          </p>
          {basename.length > 0 && !basenameValid && (
            <p className="text-xs text-destructive">
              文件名只允许字母、数字、下划线、连字符（1-64 位）
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-content">内容</Label>
          <Textarea
            id="file-content"
            placeholder={'在此输入文件内容…'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="font-mono text-sm"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中…' : '保存'}
          </Button>
          {isEditMode && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
