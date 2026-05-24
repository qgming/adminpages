// Markdown 实时预览：marked 渲染 + DOMPurify 消毒
// 样式由 src/index.css 中的 .markdown-body 提供，避免引入 @tailwindcss/typography
import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Props {
  content: string
}

// marked v18 默认同步且开启 GFM，无需额外配置
export function MarkdownPreview({ content }: Props) {
  const html = useMemo(() => {
    const rendered = marked.parse(content, { async: false }) as string
    return DOMPurify.sanitize(rendered)
  }, [content])

  return (
    <div
      className="markdown-body overflow-auto px-4 py-3 text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
