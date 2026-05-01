// 主题切换按钮：浅 / 深 / 系统三态循环
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-context'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const label = theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      title={`当前: ${label}（点击切换）`}
      aria-label="切换主题"
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
