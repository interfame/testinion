'use client'

// Lightweight rich text editor for admin/reseller content dialogs.
// Self-contained: contentEditable + execCommand toolbar + HTML source + preview.
// No new dependencies (execCommand is deprecated but universally supported).

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered,
  Quote, Link2, ImagePlus, Code, RemoveFormatting, Eye, PenLine, FileCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minRows?: number
}

type Mode = 'write' | 'html' | 'preview'

type Tool = { icon: typeof Bold; label: string; cmd?: string; arg?: string; prompt?: 'link' | 'image' }

// Static toolbar data — commands executed from the button's onMouseDown handler
const TOOLS: Tool[] = [
  { icon: Bold, label: 'Bold', cmd: 'bold' },
  { icon: Italic, label: 'Italic', cmd: 'italic' },
  { icon: Underline, label: 'Underline', cmd: 'underline' },
  { icon: Heading2, label: 'Heading 2', cmd: 'formatBlock', arg: '<h2>' },
  { icon: Heading3, label: 'Heading 3', cmd: 'formatBlock', arg: '<h3>' },
  { icon: List, label: 'Bullet list', cmd: 'insertUnorderedList' },
  { icon: ListOrdered, label: 'Numbered list', cmd: 'insertOrderedList' },
  { icon: Quote, label: 'Quote', cmd: 'formatBlock', arg: '<blockquote>' },
  { icon: Link2, label: 'Insert link', prompt: 'link' },
  { icon: ImagePlus, label: 'Insert image', prompt: 'image' },
  { icon: Code, label: 'Code block', cmd: 'formatBlock', arg: '<pre>' },
  { icon: RemoveFormatting, label: 'Clear formatting', cmd: 'removeFormat' },
]

/** Very light sanitize for the preview pane (real rendering also happens on the public blog). */
function softSanitize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

export default function RichEditor({ value, onChange, placeholder, minRows = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('write')
  const minHeight = `${Math.max(minRows, 3) * 24 + 18}px`

  // Sync incoming value → editor DOM, but only when it actually differs
  // (avoids caret jumps while typing). Re-run on mode switches because the
  // contentEditable unmounts in html/preview modes.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== el.innerHTML) el.innerHTML = value || ''
  }, [value, mode])

  const pushChange = useCallback(() => {
    const el = ref.current
    if (!el) return
    // contentEditable often leaves a stray <br> when cleared → normalize to ''
    const html = el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>' ? '' : el.innerHTML
    onChange(html)
  }, [onChange])

  // Only ever called from the toolbar's onMouseDown handlers (keeps selection)
  const runTool = useCallback((tool: Tool) => {
    const el = ref.current
    el?.focus()
    if (tool.prompt) {
      const url = window.prompt(tool.prompt === 'link' ? 'Link URL:' : 'Image URL:', 'https://')
      if (!url || url === 'https://') return
      document.execCommand(tool.prompt === 'link' ? 'createLink' : 'insertImage', false, url)
    } else if (tool.cmd) {
      document.execCommand(tool.cmd, false, tool.arg)
    }
    pushChange()
  }, [pushChange])

  return (
    <div className="overflow-hidden rounded-xl border bg-white dark:bg-zinc-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-zinc-50/80 px-1.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/80">
        {mode === 'write' && TOOLS.map((t) => {
          const Icon = t.icon
          return (
            <Button
              key={t.label}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              title={t.label}
              aria-label={t.label}
              onMouseDown={(e) => { e.preventDefault(); runTool(t) }}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
        <span className="flex-1" />
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant={mode === 'write' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px] font-bold"
            onClick={() => setMode('write')}
          >
            <PenLine className="h-3.5 w-3.5" /> Write
          </Button>
          <Button
            type="button"
            variant={mode === 'html' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px] font-bold"
            onClick={() => setMode('html')}
          >
            <FileCode className="h-3.5 w-3.5" /> HTML
          </Button>
          <Button
            type="button"
            variant={mode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px] font-bold"
            onClick={() => setMode('preview')}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
        </div>
      </div>

      {/* Write mode — contentEditable */}
      {mode === 'write' && (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Rich text editor"
          data-placeholder={placeholder}
          className="gr-rte max-w-none overflow-y-auto px-3.5 py-3 text-sm leading-6 text-zinc-800 outline-none dark:text-zinc-100 empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 dark:empty:before:text-zinc-500"
          style={{ minHeight }}
          onInput={pushChange}
          onBlur={pushChange}
        />
      )}

      {/* HTML mode — raw source for power users */}
      {mode === 'html' && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="resize-y rounded-none border-0 font-mono text-[12.5px] leading-6 focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ minHeight }}
        />
      )}

      {/* Preview mode — sanitized-ish render */}
      {mode === 'preview' && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto px-3.5 py-3"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: softSanitize(value) || '<p class="text-zinc-400">Nothing to preview yet.</p>' }}
        />
      )}
    </div>
  )
}

/** Named export so callers can `import { RichEditor } from '@/components/shared/rich-editor'`. */
export { RichEditor }
