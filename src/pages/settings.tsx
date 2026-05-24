// 管理后台 - 设置页
// 卡片网格（自适应高度）：外观 / 修改密码 / 版本信息 / 账号（登出）
// 鉴权：未登录或 401 触发 TokenPrompt
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Github,
  LogOut,
  Info,
} from 'lucide-react'
import { AdminShell } from '@/components/admin-shell'
import { TokenPrompt } from '@/components/token-prompt'
import { BackupRestoreCard } from '@/components/export-import-bar'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
import { useTheme } from '@/components/theme-context'
import type { Theme } from '@/components/theme-context'
import {
  changeAdminPassword,
  clearToken,
  getToken,
  setToken,
  UnauthorizedError,
} from '@/api'

// 版本号与仓库地址：写死，便于在版本卡片中展示
const APP_VERSION = '1.0.0'
const REPO_URL = 'https://github.com/qgming/adminpages'

export function SettingsPage() {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(() => !!getToken())
  const [tokenOpen, setTokenOpen] = useState(() => !getToken())
  const [setupRequired, setSetupRequired] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleUnauthorized = useCallback((setup = false) => {
    const msg = setup ? '请先设置管理员密码' : 'Token 无效或已过期，请重新输入'
    setSetupRequired(setup)
    setAuthError(msg)
    setTokenOpen(true)
    setLoggedIn(false)
    toast.error(msg)
  }, [])

  const handleLogout = useCallback(() => {
    clearToken()
    setLoggedIn(false)
    toast.success('已登出')
    navigate('/admin')
  }, [navigate])

  return (
    <AdminShell>
      <div className="px-4 py-5 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">设置</h1>

          {/* 显式两列布局：用两个 flex-col 容器代替 columns，避免浏览器自动平衡造成的顺序不稳定
              左列：版本信息 → 外观 → 备份与恢复
              右列：修改密码 → 账号 */}
          <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 sm:gap-6">
              <VersionInfoCard />
              <AppearanceCard />
              <BackupRestoreCard
                onImported={() => {
                  /* 设置页无项目列表需要刷新 */
                }}
                onUnauthorized={(setup) => handleUnauthorized(setup)}
              />
            </div>
            <div className="flex flex-col gap-4 sm:gap-6">
              <ChangePasswordCard
                onUnauthorized={handleUnauthorized}
                onPasswordChanged={() => setLoggedIn(true)}
              />
              {loggedIn && <AccountCard onLogout={handleLogout} />}
            </div>
          </div>
        </div>
      </div>

      <TokenPrompt
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        onConfirm={() => {
          setLoggedIn(true)
          setAuthError(null)
        }}
        setupRequired={setupRequired}
        errorMessage={authError}
        onErrorDismiss={() => setAuthError(null)}
      />
      <Toaster richColors position="top-right" />
    </AdminShell>
  )
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sun className="h-5 w-5 text-primary" />
          外观
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="theme-select" className="text-sm">
            主题
          </Label>
          <Select
            value={theme}
            onValueChange={(v) => setTheme(v as Theme)}
          >
            <SelectTrigger id="theme-select" className="w-40">
              <SelectValue placeholder="选择主题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">浅色</SelectItem>
              <SelectItem value="dark">深色</SelectItem>
              <SelectItem value="system">跟随系统</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// 版本信息卡片：展示项目名称、版本号、GitHub 仓库
function VersionInfoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5 text-primary" />
          版本信息
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">应用名称</span>
          <span className="font-medium">菟丝 Tusi</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">版本号</span>
          <span className="font-mono text-xs">v{APP_VERSION}</span>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            <Github className="mr-2 h-4 w-4" />
            GitHub 仓库
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}

// 账号卡片：当前仅提供登出按钮
function AccountCard({ onLogout }: { onLogout: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LogOut className="h-5 w-5 text-primary" />
          账号
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          当前已登录。登出后会清除本地保存的 Token，下次访问需要重新输入。
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              登出账号
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认登出？</AlertDialogTitle>
              <AlertDialogDescription>
                登出后会清除本地保存的 Token，下次访问需要重新输入。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={onLogout}>登出</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

interface ChangePasswordCardProps {
  onUnauthorized: (setup?: boolean) => void
  onPasswordChanged: () => void
}

function ChangePasswordCard({
  onUnauthorized,
  onPasswordChanged,
}: ChangePasswordCardProps) {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    oldPwd.length > 0 &&
    newPwd.length >= 8 &&
    confirmPwd.length > 0 &&
    !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd !== confirmPwd) {
      toast.error('两次输入的新密码不一致')
      return
    }
    if (newPwd === oldPwd) {
      toast.error('新密码不能与当前密码相同')
      return
    }
    setSubmitting(true)
    try {
      await changeAdminPassword(oldPwd, newPwd)
      setToken(newPwd)
      onPasswordChanged()
      setOldPwd('')
      setNewPwd('')
      setConfirmPwd('')
      toast.success('密码已更新')
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        onUnauthorized(err.setupRequired)
      } else {
        toast.error(`修改失败: ${(err as Error).message}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-5 w-5 text-primary" />
          修改密码
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <PasswordField
            id="old-password"
            label="当前密码"
            value={oldPwd}
            onChange={setOldPwd}
            visible={showOld}
            onToggle={() => setShowOld((v) => !v)}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-password"
            label="新密码（至少 8 位）"
            value={newPwd}
            onChange={setNewPwd}
            visible={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder="请输入新密码"
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="确认新密码"
            value={confirmPwd}
            onChange={setConfirmPwd}
            visible={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            placeholder="再次输入新密码"
            autoComplete="new-password"
          />
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存修改
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggle: () => void
  placeholder?: string
  autoComplete?: string
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={visible ? '隐藏密码' : '显示密码'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}
