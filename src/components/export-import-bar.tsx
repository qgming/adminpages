// 导出/导入工具栏：右上角两个按钮 + 导入对话框 + 替换模式二次确认
import { useRef, useState } from 'react'
import { Download, Upload, FileJson, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { ExportSnapshot, ImportMode, ImportResult } from '@/types'
import { exportAll, importAll, UnauthorizedError } from '@/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  // 导入成功后刷新项目列表
  onImported: () => void | Promise<void>
  // 401 时复用 admin 页面的 token 弹框
  onUnauthorized: (setupRequired: boolean) => void
}

// 给文件名带上日期，便于多次备份归档
function buildExportFilename(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `tusi-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

// 浏览器原生下载
function triggerDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 简易校验：是不是合法快照结构
function isLikelySnapshot(value: unknown): value is ExportSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<ExportSnapshot>
  return v.version === 1 && Array.isArray(v.projects)
}

export function ExportImportBar({ onImported, onUnauthorized }: Props) {
  const [exporting, setExporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false)

  // 用户选择的导入文件
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [pickedSnapshot, setPickedSnapshot] = useState<ExportSnapshot | null>(
    null,
  )
  const [parseError, setParseError] = useState<string | null>(null)
  const [mode, setMode] = useState<ImportMode>('overwrite')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===== 导出 =====
  const handleExport = async () => {
    setExporting(true)
    try {
      const snapshot = await exportAll()
      const totalFiles = snapshot.projects.reduce(
        (sum, p) => sum + (Array.isArray(p.files) ? p.files.length : 0),
        0,
      )
      triggerDownload(
        buildExportFilename(),
        JSON.stringify(snapshot, null, 2),
      )
      toast.success(
        `已导出 ${snapshot.projects.length} 个项目，${totalFiles} 个文件`,
      )
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        onUnauthorized(e.setupRequired)
      } else {
        toast.error(`导出失败: ${(e as Error).message}`)
      }
    } finally {
      setExporting(false)
    }
  }

  // ===== 导入：选择文件 =====
  const resetPicked = () => {
    setPickedFile(null)
    setPickedSnapshot(null)
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFilePick = async (file: File | null) => {
    if (!file) {
      resetPicked()
      return
    }
    setPickedFile(file)
    setParseError(null)
    setPickedSnapshot(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      if (!isLikelySnapshot(parsed)) {
        setParseError('文件不是合法的菟丝备份快照（version 必须为 1）')
        return
      }
      setPickedSnapshot(parsed)
    } catch (e) {
      setParseError(`解析失败: ${(e as Error).message}`)
    }
  }

  // ===== 导入：提交 =====
  const doImport = async () => {
    if (!pickedSnapshot) return
    setImporting(true)
    try {
      const { result } = await importAll(pickedSnapshot, mode)
      reportImportResult(result)
      setImportOpen(false)
      resetPicked()
      setMode('overwrite')
      await onImported()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        onUnauthorized(e.setupRequired)
      } else {
        toast.error(`导入失败: ${(e as Error).message}`)
      }
    } finally {
      setImporting(false)
    }
  }

  const handleImportClick = () => {
    if (!pickedSnapshot) return
    if (mode === 'replace') {
      setConfirmReplaceOpen(true)
      return
    }
    void doImport()
  }

  // 把后端返回的 ImportResult 转成 toast
  const reportImportResult = (result: ImportResult) => {
    const { imported, skipped, errors } = result
    const summary =
      `导入 ${imported.projects} 个项目 / ${imported.files} 个文件` +
      (skipped.projects > 0
        ? `，跳过 ${skipped.projects} 个项目`
        : '')
    if (errors.length === 0) {
      toast.success(summary)
    } else {
      toast.warning(`${summary}，${errors.length} 条错误`, {
        description: errors.slice(0, 5).join('；'),
      })
    }
  }

  const projectCount = pickedSnapshot?.projects.length ?? 0
  const fileCount =
    pickedSnapshot?.projects.reduce(
      (sum, p) => sum + (Array.isArray(p.files) ? p.files.length : 0),
      0,
    ) ?? 0

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={exporting}
        title="导出全部数据"
      >
        <Download className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{exporting ? '导出中…' : '导出'}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setImportOpen(true)}
        title="从备份文件导入"
      >
        <Upload className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">导入</span>
      </Button>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) {
            resetPicked()
            setMode('overwrite')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              导入数据
            </DialogTitle>
            <DialogDescription>
              选择此前用「导出」按钮生成的 JSON 备份文件。管理员密码不会被覆盖。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">备份文件</Label>
              <input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept="application/json,.json"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground hover:file:bg-secondary/80"
                onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
              />
              {parseError && (
                <p className="text-xs text-destructive">{parseError}</p>
              )}
              {pickedSnapshot && pickedFile && (
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <FileJson className="h-4 w-4 text-primary" />
                    {pickedFile.name}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    包含 {projectCount} 个项目，{fileCount} 个文件
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>导入模式</Label>
              <div className="space-y-2 text-sm">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    value="skip"
                    checked={mode === 'skip'}
                    onChange={() => setMode('skip')}
                    className="mt-0.5"
                  />
                  <div>
                    <div>合并 — 跳过已存在的项目</div>
                    <div className="text-xs text-muted-foreground">
                      仅导入当前后台没有的项目，不动现有数据
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    value="overwrite"
                    checked={mode === 'overwrite'}
                    onChange={() => setMode('overwrite')}
                    className="mt-0.5"
                  />
                  <div>
                    <div>合并 — 覆盖已存在的项目（推荐）</div>
                    <div className="text-xs text-muted-foreground">
                      同 ID 的项目用备份内容覆盖，未出现在备份中的项目保留
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    value="replace"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1 text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      替换 — 先清空全部，再导入
                    </div>
                    <div className="text-xs text-muted-foreground">
                      会删除当前所有项目和文件（管理员密码保留），仅保留备份中的数据
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setImportOpen(false)}
              disabled={importing}
            >
              取消
            </Button>
            <Button
              onClick={handleImportClick}
              disabled={!pickedSnapshot || importing}
            >
              {importing ? '导入中…' : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmReplaceOpen}
        onOpenChange={setConfirmReplaceOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>确认执行替换导入？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作会先删除当前所有项目和文件，再导入备份内容。管理员密码会保留，
              但被覆盖的项目数据无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmReplaceOpen(false)
                void doImport()
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
