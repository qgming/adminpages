// CodeMirror 6 封装：对外暴露 value/onChange，自动跟随 Tailwind 主题色
// - JSON 自带 lint，错误会用红色波浪线高亮
// - 主题色用现有 CSS 变量 (--background / --foreground / --border / --primary)
import { useEffect, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { linter } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import type { FileExt } from '@/types'

interface Props {
  value: string
  onChange: (value: string) => void
  language: FileExt
  // 编辑器固定高度（px），默认 400
  height?: number
  readOnly?: boolean
}

// 通过 EditorView.theme 定义所有外观，跟随 :root / .dark 的 CSS 变量
// CodeMirror 内部不识别 oklch()，但 Web 平台原生支持，让浏览器直接渲染即可
const tusiTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '13px',
  },
  '.cm-content': {
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    caretColor: 'var(--primary)',
    padding: '12px 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--primary)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--muted)',
    color: 'var(--muted-foreground)',
    border: 'none',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in oklch, var(--primary) 8%, transparent)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in oklch, var(--primary) 8%, transparent)',
    color: 'var(--foreground)',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor:
      'color-mix(in oklch, var(--primary) 25%, transparent) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor:
      'color-mix(in oklch, var(--primary) 25%, transparent) !important',
  },
})

// 根据扩展名挑选语言扩展
function getLanguageExtensions(language: FileExt): Extension[] {
  if (language === 'json') {
    return [json(), linter(jsonParseLinter())]
  }
  if (language === 'md') {
    return [markdown()]
  }
  return [html()]
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = 400,
  readOnly = false,
}: Props) {
  // 监听 <html> 的 .dark 类，CodeMirror 没有内置的 theme follow CSS 机制
  // 我们用 MutationObserver 触发重渲染，让 EditorView 重新应用 theme
  const [, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'))
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <CodeMirror
        value={value}
        onChange={onChange}
        height={`${height}px`}
        theme={tusiTheme}
        extensions={getLanguageExtensions(language)}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          foldGutter: false,
          autocompletion: false,
        }}
      />
    </div>
  )
}
