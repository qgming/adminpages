// 菟丝 logo：同心圆 + 四向放射节点
// 中心节点（茎）+ 四端节点（向外发布的文件 / URL）
// 使用 currentColor，可被父级 text-primary 等工具类着色
interface Props {
  className?: string
  size?: number
}

export function Logo({ className, size = 24 }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="16" y1="16" x2="16" y2="4" />
      <line x1="16" y1="16" x2="28" y2="16" />
      <line x1="16" y1="16" x2="16" y2="28" />
      <line x1="16" y1="16" x2="4" y2="16" />
      {/* 中心：用背景色填一个稍大的圆遮挡线条交叉点，再叠一个实心小圆 */}
      <circle cx="16" cy="16" r="4.5" fill="var(--background)" />
      <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="4" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="28" cy="16" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="28" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="4" cy="16" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  )
}
