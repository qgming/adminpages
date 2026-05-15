import { useMemo, useState } from 'react'
import { Globe2, Save } from 'lucide-react'
import type { ProjectCorsConfig } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  value: ProjectCorsConfig
  saving: boolean
  onSave: (config: ProjectCorsConfig) => void
}

function normalizeOriginsText(text: string): string[] {
  const seen = new Set<string>()
  const origins: string[] = []
  for (const line of text.split('\n')) {
    const origin = line.trim()
    if (!origin || seen.has(origin)) continue
    seen.add(origin)
    origins.push(origin)
  }
  return origins
}

export function CorsSettings({ value, saving, onSave }: Props) {
  const formKey = `${value.enabled}:${value.allowAll}:${value.origins.join('|')}`
  return (
    <CorsSettingsForm
      key={formKey}
      value={value}
      saving={saving}
      onSave={onSave}
    />
  )
}

function CorsSettingsForm({ value, saving, onSave }: Props) {
  const [enabled, setEnabled] = useState(value.enabled)
  const [allowAll, setAllowAll] = useState(value.allowAll)
  const [originsText, setOriginsText] = useState(value.origins.join('\n'))

  const origins = useMemo(() => normalizeOriginsText(originsText), [originsText])
  const canSave = !saving && (allowAll || origins.length > 0 || !enabled)

  const handleSave = () => {
    if (!canSave) return
    onSave({ enabled, allowAll, origins })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" />
          JSON 跨域
        </CardTitle>
        <CardDescription>
          作用于当前项目下的 <code>*.json</code> 公开地址。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span>允许跨域访问 JSON</span>
          </label>
          <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              checked={allowAll}
              onChange={(event) => setAllowAll(event.target.checked)}
              disabled={!enabled}
              className="h-4 w-4 accent-primary disabled:opacity-40"
            />
            <span>允许所有来源</span>
          </label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cors-origins">白名单 Origin</Label>
          <Textarea
            id="cors-origins"
            value={originsText}
            onChange={(event) => setOriginsText(event.target.value)}
            placeholder="https://example.com"
            disabled={!enabled || allowAll}
            rows={4}
            className="font-mono text-sm"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            每行一个完整 Origin。关闭“允许所有来源”后，仅这些来源会收到跨域响应头。
          </p>
          {enabled && !allowAll && origins.length === 0 && (
            <p className="text-xs text-destructive">
              使用白名单模式时至少填写一个 Origin。
            </p>
          )}
        </div>

        <Button onClick={handleSave} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? '保存中…' : '保存跨域配置'}
        </Button>
      </CardContent>
    </Card>
  )
}
