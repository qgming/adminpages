// 首页：菟丝品牌 + 大标题（打字机循环）+ 数据流示意
// 桌面：水平布局（左卡 -> 中心服务 -> 右卡）
// 移动：纵向布局（顶部来源卡 -> 中心服务 -> 底部 URL 卡），卡片更小
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, FileJson, FileText, FileCode, Github } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'

// 大标题文案（用打字机逐字循环显示）
const HERO_TITLE = '菟丝 · 动态文件托管'
// 每个字符出现的间隔（ms）
const TYPE_INTERVAL = 140
// 完整显示后的停留时间（ms）
const HOLD_AFTER_FULL = 1500
// 清空后到下一轮开始的间隔（ms）
const HOLD_BEFORE_RESTART = 1000

// 三种文件类型
interface FlowRow {
  label: string
  icon: LucideIcon
  // URL 拆分：路径前缀（小字） + 文件名（大字）
  urlPrefix: string
  urlFile: string
  // 光点动画的相位延迟（s），错开形成持续传输感
  leftDelay: string
  rightDelay: string
}

const FLOW_ROWS: FlowRow[] = [
  {
    label: 'JSON',
    icon: FileJson,
    urlPrefix: '/blog/',
    urlFile: 'post.json',
    leftDelay: '0s',
    rightDelay: '1.2s',
  },
  {
    label: 'Markdown',
    icon: FileText,
    urlPrefix: '/blog/',
    urlFile: 'post.md',
    leftDelay: '0.8s',
    rightDelay: '0.4s',
  },
  {
    label: 'HTML',
    icon: FileCode,
    urlPrefix: '/blog/',
    urlFile: 'post.html',
    leftDelay: '1.6s',
    rightDelay: '2.0s',
  },
]

// 布局参数：桌面（水平）与移动（纵向）两套
interface Layout {
  // 'h' = 水平流向（左→中→右），'v' = 纵向流向（上→中→下）
  direction: 'h' | 'v'
  card: number // 卡片边长
  center: number // 中心圆直径
  // 水平布局：卡片到中心圆的水平间隙、卡片间纵向间距
  // 纵向布局：卡片到中心圆的纵向间距、卡片间横向间距
  mainGap: number
  crossGap: number
  logoSize: number
  iconSize: number // 来源卡图标 px
  labelClass: string // 来源卡文字 class
  prefixClass: string // URL 前缀 class
  fileClass: string // URL 文件名 class
}

const LAYOUT_DESKTOP: Layout = {
  direction: 'h',
  card: 112,
  center: 132,
  mainGap: 160,
  crossGap: 40,
  logoSize: 56,
  iconSize: 32,
  labelClass: 'text-base font-medium',
  prefixClass: 'text-xs text-muted-foreground',
  fileClass: 'break-all text-center text-sm font-medium',
}

const LAYOUT_MOBILE: Layout = {
  direction: 'v',
  card: 84,
  center: 104,
  mainGap: 72,
  crossGap: 12,
  logoSize: 44,
  iconSize: 24,
  labelClass: 'text-xs font-medium',
  prefixClass: 'text-[10px] text-muted-foreground',
  fileClass: 'break-all text-center text-[11px] font-medium leading-tight',
}

// 根据布局计算舞台尺寸与三组锚点
function computeGeometry(L: Layout) {
  if (L.direction === 'h') {
    const stageW = L.card * 2 + L.mainGap * 2 + L.center
    const stageH = L.card * 3 + L.crossGap * 2
    const cx = stageW / 2
    const cy = stageH / 2
    // 每行卡片中心 Y
    const rowCenters = [
      L.card / 2,
      L.card + L.crossGap + L.card / 2,
      (L.card + L.crossGap) * 2 + L.card / 2,
    ]
    return {
      stageW,
      stageH,
      cx,
      cy,
      r: L.center / 2,
      // 来源卡左上角
      sourcePos: rowCenters.map((y) => ({ x: 0, y: y - L.card / 2 })),
      // URL 卡左上角
      targetPos: rowCenters.map((y) => ({
        x: stageW - L.card,
        y: y - L.card / 2,
      })),
      // 来源卡 → 中心圆 起点（卡片右沿中点）
      sourceAnchor: rowCenters.map((y) => ({ x: L.card, y })),
      // 中心圆 → URL 卡 终点（卡片左沿中点）
      targetAnchor: rowCenters.map((y) => ({ x: stageW - L.card, y })),
    }
  }
  // 纵向布局
  const stageW = L.card * 3 + L.crossGap * 2
  const stageH = L.card * 2 + L.mainGap * 2 + L.center
  const cx = stageW / 2
  const cy = stageH / 2
  // 每列卡片中心 X
  const colCenters = [
    L.card / 2,
    L.card + L.crossGap + L.card / 2,
    (L.card + L.crossGap) * 2 + L.card / 2,
  ]
  return {
    stageW,
    stageH,
    cx,
    cy,
    r: L.center / 2,
    sourcePos: colCenters.map((x) => ({ x: x - L.card / 2, y: 0 })),
    targetPos: colCenters.map((x) => ({
      x: x - L.card / 2,
      y: stageH - L.card,
    })),
    // 来源卡 → 中心圆 起点（卡片底沿中点）
    sourceAnchor: colCenters.map((x) => ({ x, y: L.card })),
    // 中心圆 → URL 卡 终点（卡片顶沿中点）
    targetAnchor: colCenters.map((x) => ({ x, y: stageH - L.card })),
  }
}

export function HomePage() {
  // 用 Array.from 安全切分多字节字符
  const chars = Array.from(HERO_TITLE)
  // 已显示的字符数；-1 表示已清空、等待下一轮开始
  const [shown, setShown] = useState(0)
  // 是否移动端布局（<768px）
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    // 已清空、等待下一轮
    if (shown < 0) {
      const t = setTimeout(() => setShown(0), HOLD_BEFORE_RESTART)
      return () => clearTimeout(t)
    }
    // 正在打字
    if (shown < chars.length) {
      const t = setTimeout(() => setShown((n) => n + 1), TYPE_INTERVAL)
      return () => clearTimeout(t)
    }
    // 打满后：停留 -> 进入清空状态
    const t = setTimeout(() => setShown(-1), HOLD_AFTER_FULL)
    return () => clearTimeout(t)
  }, [shown, chars.length])

  const L = isMobile ? LAYOUT_MOBILE : LAYOUT_DESKTOP
  const G = computeGeometry(L)

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Logo size={20} />
            <span className="font-semibold text-foreground">菟丝</span>
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
            <Button asChild>
              <Link to="/admin">
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">管理后台</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container pb-10 pt-10 sm:pb-12 sm:pt-24">
        <div className="mx-auto max-w-5xl space-y-12 sm:space-y-16">
          {/* 大标题 + 亮点句
              min-h-[1em] 防止打字机清空瞬间标题高度塌缩、下方内容抖动 */}
          <div className="space-y-4 text-center">
            <h1 className="min-h-[1em] text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-7xl">
              <span aria-label={HERO_TITLE}>
                {chars.slice(0, Math.max(shown, 0)).join('')}
                <span
                  className="typewriter-caret text-primary"
                  aria-hidden="true"
                >
                  丨
                </span>
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              让每一份 JSON / Markdown / HTML 都拥有自己的地址。
            </p>
          </div>

          {/* 数据流舞台：根据屏幕宽度切换水平 / 纵向布局 */}
          <div
            className="relative mx-auto"
            style={{ width: G.stageW, height: G.stageH }}
          >
            {/* 来源卡（图标 + 类型名） */}
            {FLOW_ROWS.map(({ label, icon: Icon }, i) => (
              <div
                key={`S-${label}`}
                className="absolute flex flex-col items-center justify-center gap-2 rounded-2xl bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10"
                style={{
                  left: G.sourcePos[i].x,
                  top: G.sourcePos[i].y,
                  width: L.card,
                  height: L.card,
                }}
              >
                <Icon
                  className="text-primary"
                  style={{ width: L.iconSize, height: L.iconSize }}
                />
                <span className={L.labelClass}>{label}</span>
              </div>
            ))}

            {/* URL 卡 */}
            {FLOW_ROWS.map(({ label, urlPrefix, urlFile }, i) => (
              <div
                key={`T-${label}`}
                className="absolute flex flex-col items-center justify-center gap-1 rounded-2xl bg-card px-2 text-card-foreground shadow-sm ring-1 ring-foreground/10"
                style={{
                  left: G.targetPos[i].x,
                  top: G.targetPos[i].y,
                  width: L.card,
                  height: L.card,
                }}
              >
                <span className={L.prefixClass}>{urlPrefix}</span>
                <code className={L.fileClass}>{urlFile}</code>
              </div>
            ))}

            {/* 中心圆：菟丝边缘服务（仅显示 Logo） */}
            <div
              className="absolute flex items-center justify-center rounded-full bg-card text-primary shadow-md ring-1 ring-foreground/10"
              style={{
                left: G.cx - G.r,
                top: G.cy - G.r,
                width: L.center,
                height: L.center,
              }}
            >
              <Logo size={L.logoSize} />
            </div>

            {/* 数据流：六条贝塞尔曲线 + 沿线运动的光点 */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={G.stageW}
              height={G.stageH}
              viewBox={`0 0 ${G.stageW} ${G.stageH}`}
              aria-hidden="true"
            >
              {FLOW_ROWS.map(({ label, leftDelay, rightDelay }, i) => {
                // 来源卡锚点 -> 中心圆周（沿连线方向的圆周交点）
                const s = G.sourceAnchor[i]
                const sDx = G.cx - s.x
                const sDy = G.cy - s.y
                const sLen = Math.hypot(sDx, sDy)
                const sxIn = G.cx - (sDx / sLen) * G.r
                const syIn = G.cy - (sDy / sLen) * G.r

                // 中心圆周 -> URL 卡锚点
                const t = G.targetAnchor[i]
                const tDx = t.x - G.cx
                const tDy = t.y - G.cy
                const tLen = Math.hypot(tDx, tDy)
                const txOut = G.cx + (tDx / tLen) * G.r
                const tyOut = G.cy + (tDy / tLen) * G.r

                // 控制点策略：先沿主流向（h: x 轴, v: y 轴）平直伸出，
                // 再向圆心方向收束，呈现 S 形弧度
                let leftPath: string
                let rightPath: string
                if (L.direction === 'h') {
                  const c1x = s.x + (sxIn - s.x) * 0.55
                  const c1y = s.y
                  const c2x = sxIn - (sxIn - s.x) * 0.15
                  const c2y = syIn
                  leftPath = `M ${s.x} ${s.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${sxIn} ${syIn}`

                  const d1x = txOut + (t.x - txOut) * 0.15
                  const d1y = tyOut
                  const d2x = t.x - (t.x - txOut) * 0.55
                  const d2y = t.y
                  rightPath = `M ${txOut} ${tyOut} C ${d1x} ${d1y}, ${d2x} ${d2y}, ${t.x} ${t.y}`
                } else {
                  // 纵向：控制点沿 y 轴延伸
                  const c1x = s.x
                  const c1y = s.y + (syIn - s.y) * 0.55
                  const c2x = sxIn
                  const c2y = syIn - (syIn - s.y) * 0.15
                  leftPath = `M ${s.x} ${s.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${sxIn} ${syIn}`

                  const d1x = txOut
                  const d1y = tyOut + (t.y - tyOut) * 0.15
                  const d2x = t.x
                  const d2y = t.y - (t.y - tyOut) * 0.55
                  rightPath = `M ${txOut} ${tyOut} C ${d1x} ${d1y}, ${d2x} ${d2y}, ${t.x} ${t.y}`
                }

                return (
                  <g key={label}>
                    <path
                      d={leftPath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.4}
                      className="text-border"
                    />
                    <path
                      d={rightPath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.4}
                      className="text-border"
                    />
                    <circle
                      r={4}
                      fill="currentColor"
                      className="flow-dot text-primary"
                      style={
                        {
                          offsetPath: `path('${leftPath}')`,
                          '--delay': leftDelay,
                        } as React.CSSProperties
                      }
                    />
                    <circle
                      r={4}
                      fill="currentColor"
                      className="flow-dot text-primary"
                      style={
                        {
                          offsetPath: `path('${rightPath}')`,
                          '--delay': rightDelay,
                        } as React.CSSProperties
                      }
                    />
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </main>
    </div>
  )
}
