// 管理后台公用顶栏：标题、面包屑、GitHub 链接、主题切换、登出、回首页
import { Link } from 'react-router-dom'
import { Home, ChevronRight, Github, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'
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

interface BreadcrumbItem {
  label: string
  to?: string // 提供则渲染为链接，否则为当前页
}

interface Props {
  breadcrumbs?: BreadcrumbItem[]
  // 当前是否处于登录态：true 才显示登出按钮
  loggedIn?: boolean
  // 点击登出后的回调（确认后触发）
  onLogout?: () => void
}

export function AdminHeader({
  breadcrumbs = [],
  loggedIn = false,
  onLogout,
}: Props) {
  return (
    <header className="border-b">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="text-primary">
            <Logo size={20} />
          </span>
          <Link to="/admin" className="font-semibold hover:underline">
            菟丝
          </Link>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex min-w-0 items-center gap-2">
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              {b.to ? (
                <Link
                  to={b.to}
                  className="truncate text-muted-foreground hover:text-foreground hover:underline"
                >
                  {b.label}
                </Link>
              ) : (
                <span className="truncate">{b.label}</span>
              )}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
            title="GitHub 仓库"
            aria-label="打开 GitHub 仓库"
          >
            <a
              href="https://github.com/qgming/adminpages"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <ThemeToggle />
          {loggedIn && onLogout && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  title="登出"
                  aria-label="登出"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">登出</span>
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
                  <AlertDialogAction onClick={onLogout}>
                    登出
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <Home className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">首页</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
