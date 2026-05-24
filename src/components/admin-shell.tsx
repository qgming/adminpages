// 管理后台公用外壳：悬浮导航（无顶栏）
// - 桌面 (>=md, 768px) 左侧悬浮纵向图标栏，贴在居中内容容器（max-w-6xl）的左外侧
//   实现：left = max(1rem, 50vw - (max-w/2) - (nav-width + gap))
// - 移动端 (<md) 底部悬浮横向图标栏，居中
// - 仅图标 + tooltip；激活态高亮 primary
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FolderKanban, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  // 路径匹配规则：exact 仅完全相等，prefix 以 to 为前缀的路径都算激活
  match: 'exact' | 'prefix'
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: '项目', icon: FolderKanban, match: 'prefix' },
  { to: '/admin/settings', label: '设置', icon: Settings, match: 'exact' },
]

interface Props {
  children: ReactNode
}

// 判断当前路径是否激活某个导航项
// /admin/settings 必须 exact，否则 /admin (prefix) 会误命中
function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === 'exact') return pathname === item.to
  if (pathname === item.to) return true
  return (
    pathname.startsWith(item.to + '/') &&
    !NAV_ITEMS.some(
      (other) => other !== item && pathname.startsWith(other.to),
    )
  )
}

export function AdminShell({ children }: Props) {
  return (
    <div className="min-h-dvh bg-background">
      {/* 主体：移动端底部留白避开悬浮底栏 */}
      <main className="min-w-0 pb-24 md:pb-8">{children}</main>

      <FloatingNav />
    </div>
  )
}

// 悬浮导航：桌面端贴在 max-w-6xl(72rem) 居中容器的左外侧，移动端底部居中
// 桌面端 left 计算：
//   - 容器中心 = 50vw，容器左边 = 50vw - 36rem
//   - nav 宽度 ≈ 60px(3.75rem)，与容器留 16px(1rem) 间距
//   - 所以 nav.left = 50vw - 36rem - 3.75rem - 1rem = calc(50vw - 40.75rem)
//   - 用 max(1rem, ...) 兜底窄屏不超出
function FloatingNav() {
  const { pathname } = useLocation()
  return (
    <nav
      aria-label="主导航"
      style={{
        // 桌面端 left 用内联 style 写 calc，避免 Tailwind 任意值的解析复杂度
        // 移动端会被下面的 className 覆盖（left-1/2）
      }}
      className={cn(
        // 通用：fixed + 卡片样式
        'fixed z-40 rounded-2xl border bg-card/95 shadow-lg backdrop-blur',
        'supports-backdrop-filter:bg-card/80',
        // 移动端：底部居中，横向
        'bottom-4 left-1/2 -translate-x-1/2 flex flex-row gap-1 px-2 py-2',
        // 桌面端：左侧贴近居中容器外侧，纵向
        'md:bottom-auto md:top-1/2 md:-translate-x-0 md:-translate-y-1/2',
        'md:left-[max(1rem,calc(50vw-40.75rem))]',
        'md:flex-col md:gap-2 md:p-2',
      )}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item)
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        )
      })}
    </nav>
  )
}
