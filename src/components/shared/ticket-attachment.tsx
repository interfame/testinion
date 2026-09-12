'use client'

// Shared ticket attachment bits: upload helper, pending-file chip and message attachment renderer.
// Files are stored ON the platform (DB via /api/uploads) and served from /api/media/<id>.

import { useRef, useState } from 'react'
import { FileText, Image as ImageIcon, Loader2, Paperclip, X, Download } from 'lucide-react'

export type UploadedFile = { url: string; name: string; mime: string; size: number }

export function isImageMime(mime?: string | null): boolean {
  return !!mime && mime.startsWith('image/')
}

export function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Upload a file to the platform. Throws with a friendly message on failure. */
export async function uploadTicketFile(file: File): Promise<UploadedFile> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/uploads', { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`)
  const d = data as { url: string; name: string; mime: string; size: number }
  return { url: d.url, name: d.name, mime: d.mime, size: d.size }
}

/** Paperclip picker button + pending attachment chip. Managed by the parent (one attachment per message). */
export function AttachmentPicker({ file, busy, onPick, onClear }: {
  file: UploadedFile | null
  busy: boolean
  onPick: (f: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-2">
      {file && (
        <span className="flex max-w-[220px] items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          {isImageMime(file.mime) ? <ImageIcon className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
          <span className="truncate">{file.name}</span>
          <span className="shrink-0 text-[10px] text-zinc-400">{formatBytes(file.size)}</span>
          <button type="button" aria-label="Remove attachment" onClick={onClear} className="shrink-0 rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      <label
        className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200 ${busy ? 'pointer-events-none opacity-60' : ''}`}
        title="Attach a file (screenshot, PDF, document) — max 4MB"
        aria-label="Attach a file"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept="image/*,application/pdf,.zip,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) onPick(f)
          }}
        />
      </label>
    </div>
  )
}

/** Renders a message's attachment inline: image preview (click to open) or a file chip. */
export function MessageAttachment({ fileUrl, fileName, fileMime, fileSize, onBrand }: {
  fileUrl?: string | null
  fileName?: string | null
  fileMime?: string | null
  fileSize?: number | null
  onBrand?: boolean
}) {
  const [broken, setBroken] = useState(false)
  const [seenUrl, setSeenUrl] = useState(fileUrl)
  if (fileUrl !== seenUrl) { setSeenUrl(fileUrl); setBroken(false) }
  if (!fileUrl) return null

  if (isImageMime(fileMime) && !broken) {
    return (
      <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-1.5 block overflow-hidden rounded-xl border border-black/10 dark:border-white/15" aria-label={`Open image ${fileName ?? ''}`}>
        <img
          src={fileUrl}
          alt={fileName ?? 'Attachment'}
          loading="lazy"
          className="max-h-56 w-auto max-w-full object-contain"
          onError={() => setBroken(true)}
        />
      </a>
    )
  }
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      className={`mt-1.5 flex max-w-[260px] items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:shadow-sm ${
        onBrand
          ? 'border-black/15 bg-black/10 text-inherit'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200'
      }`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate underline-offset-2 hover:underline">{fileName ?? 'Attachment'}</span>
      <span className="shrink-0 text-[10px] opacity-70">{formatBytes(fileSize)}</span>
      <Download className="h-3.5 w-3.5 shrink-0" />
    </a>
  )
}
