'use client'

/*
 * chat — a standalone test surface for the "chat, then archive the context
 * to Cascade" idea.
 *
 * Three halves, each proven independently:
 *   1. Chat through /api/chat, which proxies OpenRouter on a free model
 *      (the key is server-side; the client never sees it).
 *   2. Attach files, then "Save context to Cascade": with no attachment it
 *      uploads a plain conversation.json; with attachments the gateway bundles
 *      conversation.json + the files into ONE archive (POST /upload/folder) —
 *      one action_id, one fee, each entry served at /download/{id}/{path}.
 *   3. "Import" fetches a previous archive back by its action_id (keyless,
 *      CORS-open): it reads conversation.json and each listed attachment from
 *      the archive's entries, so a reader picks up transcript AND files.
 *
 * It is intentionally self-contained (no useCascade modal flow) and uploads via
 * the operator gateway (testnet), so it needs no wallet signing. Tying the
 * archive to the viewer's own wallet is the next step, not this test.
 */

import React, { useEffect, useRef, useState } from 'react'

import { CASCADE_API_URL } from '@/contants/network'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type SaveResult = { actionId: string } | { error: string } | null

const MAX_ATTACH_BYTES = 25 * 1024 * 1024
const CONVERSATION_ENTRY = 'conversation.json'

const sizeLabel = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Files whose text the model can actually read and reason about. Anything else
// is still archived, but the model is only told a binary file was attached.
const MAX_FILE_TEXT = 12000
const TEXT_EXT =
  /\.(txt|md|markdown|json|jsonl|csv|tsv|log|xml|ya?ml|html?|css|js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|kt|c|h|cpp|cs|rb|php|sh|bash|zsh|sql|env|ini|toml|conf|properties|srt|vtt)$/i
const isTextAttachment = (f: File) =>
  f.type.startsWith('text/') ||
  /^application\/(json|xml|x-yaml|yaml|javascript|x-ndjson|sql)$/.test(f.type) ||
  TEXT_EXT.test(f.name)
const readAttachmentText = async (f: File): Promise<string | null> => {
  if (!isTextAttachment(f)) return null
  try {
    const t = await f.text()
    return t.length > MAX_FILE_TEXT
      ? `${t.slice(0, MAX_FILE_TEXT)}\n…[truncated ${t.length - MAX_FILE_TEXT} more characters]`
      : t
  } catch {
    return null
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const [attachments, setAttachments] = useState<File[]>([])

  const [models, setModels] = useState<string[]>(['openrouter/free'])
  const [model, setModel] = useState('openrouter/free')
  const [chatConfigured, setChatConfigured] = useState<boolean | null>(null)
  const [uploadConfigured, setUploadConfigured] = useState<boolean | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResult>(null)

  const [importInput, setImportInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => {
        setChatConfigured(Boolean(d?.configured))
        if (Array.isArray(d?.models) && d.models.length) setModels(d.models)
        if (typeof d?.defaultModel === 'string') setModel(d.defaultModel)
      })
      .catch(() => setChatConfigured(false))
    void fetch('/api/cascade/upload')
      .then((r) => r.json())
      .then((d) => setUploadConfigured(Boolean(d?.configured)))
      .catch(() => setUploadConfigured(false))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const addAttachments = (list: FileList | null) => {
    if (!list?.length) return
    const merged = [...attachments]
    for (const f of Array.from(list)) {
      if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f)
    }
    if (merged.reduce((n, f) => n + f.size, 0) > MAX_ATTACH_BYTES) {
      setError(`Attachments exceed the ${Math.round(MAX_ATTACH_BYTES / (1024 * 1024))} MB test limit.`)
      return
    }
    setError('')
    setSaveResult(null)
    setAttachments(merged)
  }

  const removeAttachment = (name: string, size: number) =>
    setAttachments((prev) => prev.filter((f) => !(f.name === name && f.size === size)))

  const send = async () => {
    const content = input.trim()
    if ((!content && attachments.length === 0) || sending) return
    setError('')
    setSaveResult(null)

    // What the model receives: the typed text plus the readable text of any
    // attachments, so it can actually summarize / answer about the files. The
    // attachments stay attached, so the model keeps them on later turns too.
    let apiContent = content
    for (const f of attachments) {
      const text = await readAttachmentText(f)
      apiContent +=
        `\n\n--- Attached file: ${f.name} ---\n` +
        (text ?? `(binary file, ${sizeLabel(f.size)} — cannot be read as text)`)
    }
    // What the transcript shows: the typed text plus a compact file note.
    const displayContent =
      content + (attachments.length ? `\n\n📎 ${attachments.map((f) => f.name).join(', ')}` : '')

    const displayNext = [...messages, { role: 'user' as const, content: displayContent }]
    const apiNext = [...messages, { role: 'user' as const, content: apiContent }]
    setMessages(displayNext)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiNext, model }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || `Chat failed (${res.status}).`)
        return
      }
      setMessages([...displayNext, { role: 'assistant', content: data.reply || '(empty reply)' }])
    } catch {
      setError('Could not reach the chat proxy.')
    } finally {
      setSending(false)
    }
  }

  /** True for a well-formed chat turn from an imported payload. */
  const isChatMessage = (m: unknown): m is ChatMessage =>
    !!m &&
    typeof m === 'object' &&
    ['system', 'user', 'assistant'].includes((m as ChatMessage).role) &&
    typeof (m as ChatMessage).content === 'string'

  /** Load messages, model and any restored files from a parsed export. */
  const applyImportedData = (data: unknown, sourceLabel: string, files: File[] = []): boolean => {
    const d = data as { messages?: unknown; model?: unknown } | null
    const imported: ChatMessage[] = Array.isArray(d?.messages) ? d.messages.filter(isChatMessage) : []
    if (!imported.length && !files.length) {
      setImportMsg('That export has no conversation or files to import.')
      return false
    }
    setMessages(imported)
    setAttachments(files)
    setSaveResult(null)
    if (typeof d?.model === 'string' && models.includes(d.model)) setModel(d.model)
    const parts = [`${imported.length} message${imported.length === 1 ? '' : 's'}`]
    if (files.length) parts.push(`${files.length} file${files.length === 1 ? '' : 's'}`)
    setImportMsg(`Imported ${parts.join(' + ')} from ${sourceLabel} — continue below.`)
    return true
  }

  /** Accept a bare action_id, a "/action_id/<id>" path, or a full URL to it. */
  const parseActionId = (raw: string): string => {
    const s = raw.trim()
    if (!s) return ''
    const m = s.match(/action_id\/([^/?#\s]+)/)
    if (m) return m[1]
    return s.replace(/[^A-Za-z0-9]/g, '')
  }

  /** Pull the attachment files an imported archive lists in its manifest. */
  const fetchArchiveAttachments = async (
    id: string,
    manifest: Array<{ name?: string; type?: string }>,
  ): Promise<File[]> => {
    const files: File[] = []
    for (const a of manifest) {
      const name = typeof a?.name === 'string' ? a.name : ''
      if (!name) continue
      try {
        const r = await fetch(`${CASCADE_API_URL}/download/${id}/${encodeURIComponent(name)}`)
        if (!r.ok) continue
        const blob = await r.blob()
        files.push(new File([blob], name, { type: a.type || blob.type || 'application/octet-stream' }))
      } catch {
        /* skip an attachment that will not fetch */
      }
    }
    return files
  }

  /** Continue a chat archived to Cascade, by its action_id. */
  const importFromActionId = async () => {
    const id = parseActionId(importInput)
    if (!id || importing) return
    setImporting(true)
    setImportMsg('')
    setError('')
    try {
      // An archive exposes its entries: read conversation.json directly, then
      // the attachments it lists. A plain conversation-only upload has no such
      // entry, so fall back to downloading the whole object as JSON.
      const entry = await fetch(`${CASCADE_API_URL}/download/${id}/${CONVERSATION_ENTRY}`)
      if (entry.ok) {
        const conv = await entry.json()
        const files = await fetchArchiveAttachments(
          id,
          Array.isArray(conv?.attachments) ? conv.attachments : [],
        )
        if (applyImportedData(conv, id, files)) setImportInput('')
        return
      }
      const whole = await fetch(`${CASCADE_API_URL}/download/${id}`)
      if (!whole.ok) {
        setImportMsg(`Could not fetch ${id} (status ${whole.status}).`)
        return
      }
      if (applyImportedData(await whole.json(), id)) setImportInput('')
    } catch {
      setImportMsg('Could not import that context.')
    } finally {
      setImporting(false)
    }
  }

  /** Continue from a saved conversation-only .json export (no Cascade round-trip). */
  const importFromFile = async (file: File | undefined) => {
    if (!file || importing) return
    setImporting(true)
    setImportMsg('')
    setError('')
    try {
      applyImportedData(JSON.parse(await file.text()), file.name)
    } catch {
      setImportMsg('That is not a valid .json export. For an archive with files, import by its action_id.')
    } finally {
      setImporting(false)
    }
  }

  const saveToCascade = async () => {
    if ((!messages.length && !attachments.length) || saving) return
    setSaving(true)
    setSaveResult(null)
    setError('')
    try {
      const payload = {
        source: 'lumera-hub/chat',
        model,
        exportedAt: new Date().toISOString(),
        messages,
        attachments: attachments.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      }
      const convBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })

      let res: Response
      if (attachments.length) {
        // Let the gateway bundle the transcript + files into one archive, so a
        // single action_id carries the whole session and each entry is fetchable.
        const form = new FormData()
        form.append('mode', 'archive')
        form.append('label', 'chat context export')
        form.append('files', new File([convBlob], CONVERSATION_ENTRY, { type: 'application/json' }), CONVERSATION_ENTRY)
        for (const f of attachments) form.append('files', f, f.name)
        res = await fetch('/api/cascade/upload-folder', { method: 'POST', body: form })
      } else {
        const form = new FormData()
        const name = `lumera-chat-${Date.now()}.json`
        form.append('file', new File([convBlob], name, { type: 'application/json' }), name)
        form.append('label', 'chat context export')
        res = await fetch('/api/cascade/upload', { method: 'POST', body: form })
      }
      const data = await res.json()
      if (!res.ok) {
        setSaveResult({ error: data?.error || `Upload failed (${res.status}).` })
        return
      }
      const actionId = data?.action_id || data?.actionId || ''
      setSaveResult(actionId ? { actionId } : { error: 'Uploaded, but no action_id came back.' })
    } catch {
      setSaveResult({ error: 'Could not build or upload the archive.' })
    } finally {
      setSaving(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const canSave = (messages.length > 0 || attachments.length > 0) && uploadConfigured !== false

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="m-0 text-xl font-semibold text-text-primary">Chat lab</h1>
          <span className="rounded-full border border-line-edge bg-ink-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            test
          </span>
        </div>
        <p className="m-0 text-small leading-[1.6] text-text-muted text-pretty">
          Chat on a free OpenRouter model, attach files, then archive the whole session to Cascade —
          it comes back as an on-chain <code className="text-text-secondary">action_id</code> you can open at
          <code className="text-text-secondary"> /action_id/&lt;id&gt;</code>.
        </p>
      </header>

      {chatConfigured === false ? (
        <div className="rounded-[9px] border border-line-edge bg-ink-800 px-3.5 py-3 text-small text-danger">
          Chat is not configured here — set <code>OPENROUTER_API_KEY</code> in the environment.
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <label htmlFor="model" className="text-small text-text-muted">
          Model
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-control border border-line-edge bg-ink-800 px-2.5 py-1.5 text-small text-text-primary"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-text-tertiary">free · openrouter/free is the most reliable</span>
      </div>

      <div className="flex flex-col gap-1.5 rounded-[10px] border border-line-edge bg-ink-800 p-3">
        <span className="text-small text-text-muted">Continue a saved chat</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void importFromActionId()
            }}
            placeholder="Paste an action_id or /action_id/<id>"
            className="min-w-[180px] flex-1 rounded-control border border-line-edge bg-ink-900 px-3 py-2 text-small text-text-primary placeholder:text-text-tertiary focus:border-line-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void importFromActionId()}
            disabled={importing || !importInput.trim()}
            className="h-[38px] flex-none rounded-[9px] border border-line-edge bg-ink-600 px-3.5 text-small font-medium text-text-primary transition-colors hover:border-line-accent hover:text-lumera-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
          <span className="text-small text-text-tertiary">or</span>
          <label
            className={`flex h-[38px] flex-none items-center rounded-[9px] border border-line-edge bg-ink-600 px-3.5 text-small font-medium text-text-primary transition-colors hover:border-line-accent hover:text-lumera-green ${importing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          >
            Upload .json
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void importFromFile(e.target.files?.[0])
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
        {importMsg ? <span className="text-small text-text-muted text-pretty">{importMsg}</span> : null}
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-[320px] flex-col gap-3 overflow-y-auto rounded-[12px] border border-line-edge bg-ink-800 p-4"
        style={{ maxHeight: '52vh' }}
      >
        {messages.length === 0 ? (
          <p className="m-auto text-small text-text-tertiary">Say something to start the conversation.</p>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[80%] whitespace-pre-wrap rounded-[10px] rounded-br-[3px] bg-lumera-green/15 px-3.5 py-2.5 text-base leading-[1.55] text-text-primary'
                    : 'max-w-[80%] whitespace-pre-wrap rounded-[10px] rounded-bl-[3px] border border-line-edge bg-ink-600 px-3.5 py-2.5 text-base leading-[1.55] text-text-secondary'
                }
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending ? (
          <div className="flex justify-start">
            <div className="rounded-[10px] border border-line-edge bg-ink-600 px-3.5 py-2.5 text-base text-text-tertiary">
              Thinking…
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="m-0 text-small text-danger text-pretty">{error}</p> : null}

      {/* Attached files ride along with the conversation into the archive. */}
      {attachments.length ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((f) => (
            <span
              key={`${f.name}:${f.size}`}
              className="inline-flex items-center gap-2 rounded-chip border border-line-edge bg-ink-800 py-1 pl-2.5 pr-1.5 text-small text-text-secondary"
            >
              <span className="min-w-0 max-w-[220px] truncate">📎 {f.name}</span>
              <span className="text-text-tertiary">{sizeLabel(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => removeAttachment(f.name, f.size)}
                className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-ink-600 hover:text-danger"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <label
          aria-label="Attach files"
          title="Attach files"
          className="flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center rounded-[10px] border border-line-edge bg-ink-800 text-lg text-text-tertiary transition-colors hover:border-line-accent hover:text-lumera-green"
        >
          📎
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addAttachments(e.target.files)
              e.currentTarget.value = ''
            }}
          />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Message… (Enter to send, Shift+Enter for a new line)"
          disabled={chatConfigured === false}
          className="flex-1 resize-none rounded-[10px] border border-line-edge bg-ink-800 px-3.5 py-2.5 text-base text-text-primary placeholder:text-text-tertiary focus:border-line-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || (!input.trim() && attachments.length === 0) || chatConfigured === false}
          className="h-[44px] flex-none rounded-[10px] bg-lumera-green px-4 text-small font-semibold text-ink-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-[12px] border border-line-edge bg-ink-800 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-base font-medium text-text-primary">Archive to Cascade</span>
            <span className="text-small text-text-muted">
              {attachments.length
                ? `Uploads a ZIP (conversation + ${attachments.length} file${attachments.length === 1 ? '' : 's'}) and returns its action_id.`
                : 'Uploads this conversation as a JSON file and returns its action_id.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void saveToCascade()}
            disabled={saving || !canSave}
            className="h-[40px] flex-none rounded-[9px] border border-line-edge bg-ink-600 px-4 text-small font-medium text-text-primary transition-colors hover:border-line-accent hover:text-lumera-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Uploading…' : 'Save context to Cascade'}
          </button>
        </div>

        {saveResult && 'actionId' in saveResult ? (
          <div className="rounded-[9px] border border-line-edge bg-ink-600 px-3.5 py-2.5 text-small">
            <div className="text-text-secondary">
              Archived · action_id <code className="text-lumera-green">{saveResult.actionId}</code>
            </div>
            <a
              href={`/action_id/${saveResult.actionId}`}
              target="_blank"
              rel="noreferrer"
              className="text-lumera-green underline"
            >
              Open /action_id/{saveResult.actionId} ↗
            </a>
          </div>
        ) : null}

        {saveResult && 'error' in saveResult ? (
          <p className="m-0 text-small text-danger text-pretty">{saveResult.error}</p>
        ) : null}
      </div>
    </div>
  )
}
