// 新建 / 编辑文件表单：选择类型、填写文件名和内容
// 使用 CodeMirror 6 提供语法高亮 / 行号 / 自动缩进
// Markdown 类型在桌面端启用分屏预览，移动端用 Tab 切换
import { lazy, Suspense, useState } from 'react'
import { Save, X, FilePlus2, FileEdit, Eye, EyeOff, Wand2 } from 'lucide-react'
import type { FileItem, FileExt } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { cn } from '@/lib/utils'

// 懒加载 CodeMirror 与预览，避免首屏拉胖 bundle
const CodeEditor = lazy(() =>
  import('@/components/code-editor').then((m) => ({ default: m.CodeEditor })),
)
const MarkdownPreview = lazy(() =>
  import('@/components/markdown-preview').then((m) => ({
    default: m.MarkdownPreview,
  })),
)

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
  // Markdown 分屏：桌面端默认显示预览，移动端默认隐藏
  const [previewVisible, setPreviewVisible] = useState(true)
  // 移动端 Markdown Tab：'edit' | 'preview'
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')

  const filename = `${basename}.${fileExt}`
  const basenameValid = BASENAME_RE.test(basename)
  const canSave = !saving && basenameValid && content.length > 0
  const isMarkdown = fileExt === 'md'
  const isJson = fileExt === 'json'

  // JSON 一键格式化（解析后 2 空格缩进重新输出）
  const handleFormatJson = () => {
    try {
      setContent(JSON.stringify(JSON.parse(content), null, 2))
    } catch {
      // 解析失败时静默：保存时后端会再校验并报错
    }
  }

  const handleSave = () => {
    if (!canSave) return
    onSave({ filename, content })
  }

  const editorFallback = (
    <div className="flex h-[400px] items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
      加载编辑器中…
    </div>
  )

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>内容</Label>
            <div className="flex gap-2">
              {isJson && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormatJson}
                  title="格式化 JSON"
                  type="button"
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  格式化
                </Button>
              )}
              {isMarkdown && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewVisible((v) => !v)}
                  title="切换预览（桌面分屏）"
                  type="button"
                  className="hidden md:inline-flex"
                >
                  {previewVisible ? (
                    <>
                      <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                      隐藏预览
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      显示预览
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Markdown 桌面端：可分屏；移动端：Tab 切换 */}
          {isMarkdown ? (
            <>
              {/* 移动端 Tab */}
              <div className="flex rounded-md border bg-muted/30 p-0.5 md:hidden">
                <button
                  type="button"
                  className={cn(
                    'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    mobileTab === 'edit'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => setMobileTab('edit')}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
                    mobileTab === 'preview'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground',
                  )}
                  onClick={() => setMobileTab('preview')}
                >
                  预览
                </button>
              </div>

              {/* 桌面端：分屏布局 */}
              <div
                className={cn(
                  'hidden gap-3 md:grid',
                  previewVisible ? 'md:grid-cols-2' : 'md:grid-cols-1',
                )}
              >
                <Suspense fallback={editorFallback}>
                  <CodeEditor
                    value={content}
                    onChange={setContent}
                    language="md"
                    height={400}
                  />
                </Suspense>
                {previewVisible && (
                  <div className="overflow-hidden rounded-md border bg-background">
                    <div className="h-[400px] overflow-auto">
                      <Suspense
                        fallback={
                          <div className="p-4 text-sm text-muted-foreground">
                            加载预览…
                          </div>
                        }
                      >
                        <MarkdownPreview content={content} />
                      </Suspense>
                    </div>
                  </div>
                )}
              </div>

              {/* 移动端：仅显示当前 Tab */}
              <div className="md:hidden">
                {mobileTab === 'edit' ? (
                  <Suspense fallback={editorFallback}>
                    <CodeEditor
                      value={content}
                      onChange={setContent}
                      language="md"
                      height={360}
                    />
                  </Suspense>
                ) : (
                  <div className="overflow-hidden rounded-md border bg-background">
                    <div className="h-[360px] overflow-auto">
                      <Suspense
                        fallback={
                          <div className="p-4 text-sm text-muted-foreground">
                            加载预览…
                          </div>
                        }
                      >
                        <MarkdownPreview content={content} />
                      </Suspense>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Suspense fallback={editorFallback}>
              <CodeEditor
                value={content}
                onChange={setContent}
                language={fileExt}
                height={400}
              />
            </Suspense>
          )}
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
