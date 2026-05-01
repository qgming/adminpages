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
import { setToken } from '@/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  // 上一次鉴权失败的错误消息；为空表示是首次进入而非鉴权失败
  errorMessage?: string | null
  // 用户开始重新输入或关闭弹窗时，清除外部错误状态
  onErrorDismiss?: () => void
}

export function TokenPrompt({
  open,
  onOpenChange,
  onConfirm,
  errorMessage,
  onErrorDismiss,
}: Props) {
  const [value, setValue] = useState('')

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setToken(trimmed)
    setValue('')
    onErrorDismiss?.()
    onOpenChange(false)
    onConfirm()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    // 用户开始重新输入即视为承认错误，清除上次错误提示
    if (errorMessage) onErrorDismiss?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            需要管理员 Token
          </DialogTitle>
          <DialogDescription>
            Token 将保存到浏览器 localStorage，所有管理请求会自动附带。
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="admin-token">ADMIN_TOKEN</Label>
          <Input
            id="admin-token"
            type="password"
            placeholder="输入 Cloudflare Pages 中配置的 ADMIN_TOKEN"
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            aria-invalid={!!errorMessage}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!value.trim()}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
