// Token 输入弹窗：首次访问 /admin 或鉴权失败时弹出
// 鉴权失败场景下展示醒目的错误条，便于用户区分「首次输入」与「输错重输」
import { useState } from 'react'
import { KeyRound, AlertCircle } from 'lucide-react'
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
} from '@/components/ui/dialog'
import { setToken, setupAdminToken } from '@/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  setupRequired?: boolean
  // 上一次鉴权失败的错误消息；为空表示是首次进入而非鉴权失败
  errorMessage?: string | null
  // 用户开始重新输入或关闭弹窗时，清除外部错误状态
  onErrorDismiss?: () => void
}

export function TokenPrompt({
  open,
  onOpenChange,
  onConfirm,
  setupRequired = false,
  errorMessage,
  onErrorDismiss,
}: Props) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleConfirm = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      if (setupRequired) {
        await setupAdminToken(trimmed)
      }
      setToken(trimmed)
      setValue('')
      setLocalError(null)
      onErrorDismiss?.()
      onOpenChange(false)
      onConfirm()
    } catch (e) {
      setLocalError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    // 用户开始重新输入即视为承认错误，清除上次错误提示
    setLocalError(null)
    if (errorMessage) onErrorDismiss?.()
  }

  const visibleError = localError ?? errorMessage
  const title = setupRequired ? '设置管理员密码' : '需要管理员 Token'
  const description = setupRequired
    ? '首次部署后需要设置管理员密码，密码会哈希后保存到 KV。'
    : 'Token 将保存到浏览器 localStorage，所有管理请求会自动附带。'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {visibleError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{visibleError}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="admin-token">
            {setupRequired ? '管理员密码' : 'ADMIN_TOKEN'}
          </Label>
          <Input
            id="admin-token"
            type="password"
            placeholder={setupRequired ? '至少 8 位' : '输入管理员密码'}
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && void handleConfirm()}
            aria-invalid={!!visibleError}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!value.trim() || submitting}
          >
            {submitting ? '处理中…' : '确定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
