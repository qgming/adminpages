// 管理后台公用顶栏：标题、面包屑、主题切换、回首页
import { Link } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'

interface BreadcrumbItem {
  label: string
  to?: string // 提供则渲染为链接，否则为当前页
}

interface Props {
  breadcrumbs?: BreadcrumbItem[]
}

export function AdminHeader({ breadcrumbs = [] }: Props) {
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
          <ThemeToggle />
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
