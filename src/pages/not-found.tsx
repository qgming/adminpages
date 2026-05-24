// 全局 404 页：所有未匹配的路由都会落到这里
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileQuestion className="h-10 w-10" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-xl font-semibold">页面不见踪迹</p>
        <p className="mt-2 text-sm text-muted-foreground">
          你访问的页面不存在或已被迁移。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回上一页
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              回到首页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
