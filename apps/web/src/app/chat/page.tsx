'use client'

/*
 * chat — a standalone test surface for the "chat, then archive the context
 * to Cascade" idea.
 *
 * Two halves, each proven independently:
 *   1. Chat through /api/chat, which proxies OpenRouter on a free model
 *      (the key is server-side; the client never sees it).
 *   2. "Save context to Cascade" serialises the whole conversation to a JSON
 *      file and pushes it through the existing /api/cascade/upload gateway,
 *      which returns an on-chain action_id — the same id the /action_id/<id>
 *      page resolves.
 *   3. "Import" fetches a previously archived conversation back by its
 *      action_id (the gateway /download is keyless and CORS-open) and loads its
 *      messages, so a reader can pick up from where they stopped.
 *
 * It is intentionally self-contained (no useCascade modal flow) and uploads via
 * the operator gateway, so it needs no wallet signing. Tying the archive to the
 * viewer's own wallet is the next step, not this test.
 */

import React, { useEffect, useRef, useState } from 'react'

import { CASCADE_API_URL } from '@/contants/network'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

type SaveResult = { actionId: string } | { error: string } | null

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

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

  const send = async () => {
    const content = input.trim()
    if (!content || sending) return
    setError('')
    setSaveResult(null)
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, model }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || `Chat failed (${res.status}).`)
        return
      }
      setMessages([...next, { role: 'assistant', content: data.reply || '(empty reply)' }])
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

  /** Load messages (and the model, if still offered) from a parsed export. */
  const applyImportedData = (data: unknown, sourceLabel: string): boolean => {
    const d = data as { messages?: unknown; model?: unknown } | null
    const imported: ChatMessage[] = Array.isArray(d?.messages) ? d.messages.filter(isChatMessage) : []
    if (!imported.length) {
      setImportMsg('That export has no chat messages to import.')
      return false
    }
    setMessages(imported)
    setSaveResult(null)
    if (typeof d?.model === 'string' && models.includes(d.model)) setModel(d.model)
    setImportMsg(
      `Imported ${imported.length} message${imported.length === 1 ? '' : 's'} from ${sourceLabel} — continue below.`,
    )
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

  /** Continue a chat that was archived to Cascade, by its action_id. */
  const importFromActionId = async () => {
    const id = parseActionId(importInput)
    if (!id || importing) return
    setImporting(true)
    setImportMsg('')
    setError('')
    try {
      // Downloads are keyless and CORS-open, so this reads the archived JSON
      // straight from the gateway.
      const res = await fetch(`${CASCADE_API_URL}/download/${id}`)
      if (!res.ok) {
        setImportMsg(`Could not fetch ${id} (status ${res.status}).`)
        return
      }
      const data = await res.json().catch(() => null)
      if (applyImportedData(data, id)) setImportInput('')
    } catch {
      setImportMsg('Could not import that context.')
    } finally {
      setImporting(false)
    }
  }

  /** Continue from a saved export file, without going through Cascade. */
  const importFromFile = async (file: File | undefined) => {
    if (!file || importing) return
    setImporting(true)
    setImportMsg('')
    setError('')
    try {
      applyImportedData(JSON.parse(await file.text()), file.name)
    } catch {
      setImportMsg('That file is not a valid chat export.')
    } finally {
      setImporting(false)
    }
  }

  const saveToCascade = async () => {
    if (!messages.length || saving) return
    setSaving(true)
    setSaveResult(null)
    setError('')
    try {
      const payload = {
        source: 'lumera-hub/chat',
        model,
        exportedAt: new Date().toISOString(),
        messages,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const file = new File([blob], `lumera-chat-${Date.now()}.json`, { type: 'application/json' })
      const form = new FormData()
      form.append('file', file, file.name)
      form.append('label', 'chat context export')

      const res = await fetch('/api/cascade/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setSaveResult({ error: data?.error || `Upload failed (${res.status}).` })
        return
      }
      const actionId = data?.action_id || data?.actionId || ''
      setSaveResult(actionId ? { actionId } : { error: 'Uploaded, but no action_id came back.' })
    } catch {
      setSaveResult({ error: 'Could not reach the storage gateway.' })
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
          Chat on a free OpenRouter model, then archive the whole conversation to Cascade — it
          comes back as an on-chain <code className="text-text-secondary">action_id</code> you can open at
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
            <div
              key={i}
              className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
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

      <div className="flex items-end gap-2">
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
          disabled={sending || !input.trim() || chatConfigured === false}
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
              Uploads this conversation as a JSON file and returns its action_id.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void saveToCascade()}
            disabled={saving || messages.length === 0 || uploadConfigured === false}
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
