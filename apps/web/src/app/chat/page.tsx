'use client'

/*
 * Chat lab — bring your own OpenRouter key, chat on a free model, attach files,
 * then archive the whole session to Cascade.
 *
 * BYOK by design: the key is held in this browser tab (sessionStorage) and the
 * chat request goes straight from the browser to OpenRouter — nothing passes
 * through Lumera or the chain. Save and open also go through the connected
 * wallet (the SDK), registering the object on chain under the viewer's OWN
 * account and storing it privately — not the operator gateway (api.lumera.help).
 *
 * Two columns: the conversation + composer on the left, and a right rail with
 * the key, the model picker, "continue a saved chat", and the archive panel.
 */

import React, { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'

import useWalletCascade, { type CascadePhase } from '@/hooks/useWalletCascade'
import { NETWORK_PROFILE } from '@/contants/network'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type SaveResult = { actionId: string } | { error: string } | null

/** A chat archived to Cascade, remembered locally so it can be reopened by name. */
type HistoryEntry = {
  actionId: string
  name: string
  savedAt: string
  messages: number
  attachments: number
}

const KEY_STORE = 'lumera:openrouter-key'
const CONVERSATION_ENTRY = 'conversation.json'
const MAX_ATTACH_BYTES = 25 * 1024 * 1024
const MAX_FILE_TEXT = 12000

// Wallet-signed Cascade has no server index of a user's own objects (only the
// owner wallet can list them, and the indexer lags), so we keep a lightweight
// list of what this browser saved, scoped per wallet address AND network —
// action_ids collide across chains, and one machine may hold several wallets.
const HISTORY_PREFIX = 'lumera:chat-history'
const historyKey = (address: string) => `${HISTORY_PREFIX}:${NETWORK_PROFILE}:${address.toLowerCase()}`

const loadHistory = (address: string): HistoryEntry[] => {
  if (!address) return []
  try {
    const raw = localStorage.getItem(historyKey(address))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((e) => e && typeof e.actionId === 'string') : []
  } catch {
    return []
  }
}
const persistHistory = (address: string, entries: HistoryEntry[]) => {
  if (!address) return
  try {
    localStorage.setItem(historyKey(address), JSON.stringify(entries.slice(0, 50)))
  } catch {
    /* private mode / quota — history just won't persist */
  }
}

const relTime = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** The free models the design offers; the first is the reliable default. */
const MODELS: { id: string; note: string }[] = [
  { id: 'openrouter/free', note: 'free · openrouter/free is the most reliable' },
  { id: 'deepseek/deepseek-chat-v3:free', note: 'free · slower, longer context' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', note: 'free · rate limited at peak' },
]

const sizeLabel = (bytes: number) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
  const [apiKey, setApiKey] = useState('')
  const [keyInput, setKeyInput] = useState('')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [model, setModel] = useState(MODELS[0].id)

  const { canUse: walletReady, address, uploadBytes, downloadBytes, openConnectView } =
    useWalletCascade()
  const [savePhase, setSavePhase] = useState<CascadePhase | null>(null)

  const [importInput, setImportInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResult>(null)
  const [saveName, setSaveName] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const scrollRef = useRef<HTMLDivElement>(null)
  const hasKey = apiKey.trim().length > 0

  // Load the key from this tab's session on mount, and whether Cascade archive
  // is configured on this deployment.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORE)
      if (saved) setApiKey(saved)
    } catch {
      /* private mode / blocked storage — key just won't persist */
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Show the chats this browser saved under the connected wallet.
  useEffect(() => {
    setHistory(loadHistory(address))
  }, [address])

  const rememberEntry = (entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((e) => e.actionId !== entry.actionId)]
      persistHistory(address, next)
      return next
    })
  }
  const forgetEntry = (actionId: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.actionId !== actionId)
      persistHistory(address, next)
      return next
    })
  }

  const linkKey = () => {
    const k = keyInput.trim()
    if (!k) return
    setApiKey(k)
    setKeyInput('')
    setError('')
    try {
      sessionStorage.setItem(KEY_STORE, k)
    } catch {
      /* not persisted, but usable this session */
    }
  }
  const removeKey = () => {
    setApiKey('')
    try {
      sessionStorage.removeItem(KEY_STORE)
    } catch {
      /* ignore */
    }
  }

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
    if ((!content && attachments.length === 0) || sending || !hasKey) return
    setError('')
    setSaveResult(null)

    // Inline the readable text of attachments so the model can work with files.
    let apiContent = content
    for (const f of attachments) {
      const text = await readAttachmentText(f)
      apiContent +=
        `\n\n--- Attached file: ${f.name} ---\n` +
        (text ?? `(binary file, ${sizeLabel(f.size)} — cannot be read as text)`)
    }
    const displayContent =
      content + (attachments.length ? `\n\n📎 ${attachments.map((f) => f.name).join(', ')}` : '')

    const displayNext = [...messages, { role: 'user' as const, content: displayContent }]
    const apiNext = [...messages, { role: 'user' as const, content: apiContent }]
    setMessages(displayNext)
    setInput('')
    setSending(true)
    try {
      // Straight to OpenRouter with the viewer's own key — nothing via Lumera.
      // Send the picked model plus the others as fallback (free pool 429s a lot).
      const candidates = [model, ...MODELS.map((m) => m.id).filter((id) => id !== model)].slice(0, 3)
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://hub.lumera.io',
          'X-Title': 'Lumera Hub Chat lab',
        },
        // Generous cap: some free routes are reasoning models that spend tokens
        // thinking, and a low cap returns an empty reply.
        body: JSON.stringify({ models: candidates, messages: apiNext, max_tokens: 2048 }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          res.status === 401
            ? 'OpenRouter rejected that key — check it and link it again.'
            : res.status === 429
              ? 'All free models are busy right now (OpenRouter rate limit). Wait a few seconds and retry.'
              : data?.error?.message || `Chat failed (${res.status}).`
        setError(msg)
        return
      }
      const reply = data?.choices?.[0]?.message?.content || '(empty reply)'
      setMessages([...displayNext, { role: 'assistant', content: reply }])
    } catch {
      setError('Could not reach OpenRouter from the browser.')
    } finally {
      setSending(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setAttachments([])
    setSaveResult(null)
    setSaveName('')
    setError('')
  }

  const isChatMessage = (m: unknown): m is ChatMessage =>
    !!m &&
    typeof m === 'object' &&
    ['system', 'user', 'assistant'].includes((m as ChatMessage).role) &&
    typeof (m as ChatMessage).content === 'string'

  const applyImportedData = (data: unknown, sourceLabel: string, files: File[] = []): boolean => {
    const d = data as { messages?: unknown; model?: unknown; name?: unknown } | null
    const imported: ChatMessage[] = Array.isArray(d?.messages) ? d.messages.filter(isChatMessage) : []
    if (!imported.length && !files.length) {
      setImportMsg('That export has no conversation or files to import.')
      return false
    }
    setMessages(imported)
    setAttachments(files)
    setSaveResult(null)
    if (typeof d?.name === 'string' && d.name.trim()) setSaveName(d.name.trim())
    if (typeof d?.model === 'string' && MODELS.some((m) => m.id === d.model)) setModel(d.model)
    const parts = [`${imported.length} message${imported.length === 1 ? '' : 's'}`]
    if (files.length) parts.push(`${files.length} file${files.length === 1 ? '' : 's'}`)
    setImportMsg(`Imported ${parts.join(' + ')} from ${sourceLabel} — continue below.`)
    return true
  }

  const parseActionId = (raw: string): string => {
    const s = raw.trim()
    if (!s) return ''
    const m = s.match(/action_id\/([^/?#\s]+)/)
    if (m) return m[1]
    return s.replace(/[^A-Za-z0-9]/g, '')
  }

  // Record an opened/saved chat in the local history so it can be reopened by name.
  const recordHistory = (id: string, conv: unknown, fileCount: number) => {
    const c = conv as { name?: unknown; exportedAt?: unknown; messages?: unknown; attachments?: unknown }
    const name = typeof c?.name === 'string' && c.name.trim() ? c.name.trim() : `Chat ${id}`
    const savedAt = typeof c?.exportedAt === 'string' ? c.exportedAt : new Date().toISOString()
    const messages = Array.isArray(c?.messages) ? c.messages.length : 0
    const attachments = fileCount || (Array.isArray(c?.attachments) ? c.attachments.length : 0)
    rememberEntry({ actionId: id, name, savedAt, messages, attachments })
  }

  const importFromActionId = async (raw?: string) => {
    const id = parseActionId(raw ?? importInput)
    if (!id || importing) return
    if (!walletReady) {
      setImportMsg('Connect a Keplr wallet to open a chat you saved.')
      openConnectView()
      return
    }
    setImporting(true)
    setImportMsg('')
    setError('')
    try {
      // Pull the object through the wallet/SDK — not the operator gateway.
      const bytes = await downloadBytes(id)
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b
      if (isZip) {
        const zip = await JSZip.loadAsync(bytes)
        const convEntry = zip.file(CONVERSATION_ENTRY)
        if (!convEntry) {
          setImportMsg('That archive has no conversation.json.')
          return
        }
        const conv = JSON.parse(await convEntry.async('string'))
        const files: File[] = []
        await Promise.all(
          Object.values(zip.files).map(async (entry) => {
            if (entry.dir || entry.name === CONVERSATION_ENTRY) return
            const blob = await entry.async('blob')
            files.push(new File([blob], entry.name, { type: blob.type || 'application/octet-stream' }))
          }),
        )
        if (applyImportedData(conv, id, files)) {
          setImportInput('')
          recordHistory(id, conv, files.length)
        }
      } else {
        const conv = JSON.parse(new TextDecoder().decode(bytes))
        if (applyImportedData(conv, id)) {
          setImportInput('')
          recordHistory(id, conv, 0)
        }
      }
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'Could not open that chat.')
    } finally {
      setImporting(false)
    }
  }

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

  const buildPayload = () => ({
    source: 'lumera-hub/chat',
    name: saveName.trim(),
    visibility: 'private',
    model,
    exportedAt: new Date().toISOString(),
    messages,
    attachments: attachments.map((f) => ({ name: f.name, type: f.type, size: f.size })),
  })

  const payloadBytes =
    JSON.stringify(buildPayload()).length + attachments.reduce((n, f) => n + f.size, 0)

  const saveToCascade = async () => {
    if ((!messages.length && !attachments.length) || saving) return
    if (!walletReady) {
      setSaveResult({ error: 'Connect a Keplr wallet to save under your Cascade account.' })
      openConnectView()
      return
    }
    if (!saveName.trim()) {
      setSaveResult({ error: 'Give this chat a name before saving.' })
      return
    }
    setSaving(true)
    setSaveResult(null)
    setError('')
    setSavePhase('encoding')
    try {
      // Sign + store through the wallet/SDK, under the viewer's own account —
      // a raw JSON when there are no files, a zip of conversation.json + files
      // when there are.
      const convJson = JSON.stringify(buildPayload(), null, 2)
      // The name the user typed becomes the on-chain object name (sanitised to a
      // safe filename); fall back to a timestamp if somehow empty.
      const base =
        saveName
          .trim()
          .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80) || `lumera-chat-${Date.now()}`
      let fileName: string
      let bytes: Uint8Array
      if (attachments.length) {
        const zip = new JSZip()
        zip.file(CONVERSATION_ENTRY, convJson)
        for (const f of attachments) zip.file(f.name, f)
        bytes = await zip.generateAsync({ type: 'uint8array' })
        fileName = `${base}.zip`
      } else {
        bytes = new TextEncoder().encode(convJson)
        fileName = `${base}.json`
      }
      const actionId = await uploadBytes(fileName, bytes, setSavePhase)
      if (actionId) {
        setSaveResult({ actionId })
        rememberEntry({
          actionId,
          name: saveName.trim() || base,
          savedAt: new Date().toISOString(),
          messages: messages.length,
          attachments: attachments.length,
        })
      } else {
        setSaveResult({ error: 'Stored, but no action_id came back.' })
      }
    } catch (e) {
      setSaveResult({ error: e instanceof Error ? e.message : 'Could not save to Cascade.' })
    } finally {
      setSaving(false)
      setSavePhase(null)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const hasContent = messages.length > 0 || attachments.length > 0
  const canSave = hasContent && saveName.trim().length > 0
  const composerDisabled = !hasKey || sending
  const PHASE_LABEL: Record<CascadePhase, string> = {
    encoding: 'Encoding…',
    signing: 'Sign in your wallet…',
    registering: 'Registering on chain…',
    storing: 'Storing on supernodes…',
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <h1 className="m-0 text-title font-semibold tracking-[-0.02em] text-text-primary">Chat lab</h1>
          <span className="rounded-full border border-line-edge bg-ink-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            test
          </span>
        </div>
        <p className="m-0 max-w-[760px] text-base leading-[1.6] text-text-muted text-pretty">
          Bring your own OpenRouter key, chat on a free model, attach files, then archive the whole
          session to Cascade — it comes back as an on-chain{' '}
          <code className="text-text-secondary">action_id</code> you can open at{' '}
          <code className="text-text-secondary">/action_id/&lt;id&gt;</code>.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* ── Conversation column ─────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col overflow-hidden rounded-card border border-line-edge bg-ink-800">
            <div className="flex items-center justify-between border-b border-line-hairline px-4 py-3">
              <span className="font-mono text-micro leading-none font-medium tracking-[0.1em] text-text-tertiary uppercase">
                Conversation
              </span>
              <div className="flex items-center gap-3">
                <span className="text-small text-text-tertiary">
                  {messages.length ? `${messages.length} message${messages.length === 1 ? '' : 's'}` : 'No messages yet'}
                </span>
                <button
                  type="button"
                  onClick={clearConversation}
                  disabled={!messages.length && !attachments.length}
                  className="text-small font-medium text-text-muted transition-colors hover:text-lumera-green disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex min-h-[380px] flex-col gap-3 overflow-y-auto p-4"
              style={{ maxHeight: '54vh' }}
            >
              {messages.length === 0 ? (
                <div className="m-auto flex max-w-[380px] flex-col items-center gap-2 text-center">
                  <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full border border-line-edge bg-ink-700 text-lumera-green">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
                    </svg>
                  </span>
                  <span className="text-base font-semibold text-text-primary">
                    {hasKey ? 'Say something to start' : 'Link an OpenRouter key to start'}
                  </span>
                  <span className="text-small leading-[1.55] text-text-muted text-pretty">
                    Chat lab runs on your own OpenRouter account, so usage is billed to you and nothing
                    passes through Lumera. Free models cost nothing to call.
                  </span>
                </div>
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
          </div>

          {error ? <p className="m-0 text-small text-danger text-pretty">{error}</p> : null}

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
              title={hasKey ? 'Attach files' : 'Link a key first'}
              className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[10px] border border-line-edge bg-ink-800 text-lg text-text-tertiary transition-colors ${composerDisabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-line-accent hover:text-lumera-green'}`}
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
              placeholder={hasKey ? 'Message… (Enter to send, Shift+Enter for a new line)' : 'Link an OpenRouter key to start'}
              disabled={composerDisabled}
              className="flex-1 resize-none rounded-[10px] border border-line-edge bg-ink-800 px-3.5 py-2.5 text-base text-text-primary placeholder:text-text-tertiary focus:border-line-accent focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={composerDisabled || (!input.trim() && attachments.length === 0)}
              className="h-[46px] flex-none rounded-[10px] bg-lumera-green px-5 text-small font-semibold text-ink-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {!hasKey ? (
            <span className="text-small text-text-tertiary">
              Add your OpenRouter API key in the right rail to enable this model.
            </span>
          ) : null}
        </div>

        {/* ── Right rail ──────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          {/* OpenRouter key (BYOK) */}
          <div className="flex flex-col gap-2.5 rounded-card border border-line-accent bg-ink-800 p-4">
            <div className="flex items-center gap-2">
              <span aria-hidden>🔑</span>
              <span className="text-base font-semibold text-text-primary">OpenRouter API key</span>
            </div>
            <p className="m-0 text-small leading-[1.5] text-text-muted text-pretty">
              Bring your own key. It is held in this browser tab only, sent straight to OpenRouter, and
              never reaches Lumera or the chain.
            </p>
            {hasKey ? (
              <div className="flex items-center justify-between gap-2 rounded-control border border-line-edge bg-ink-900 px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-small text-lumera-green">
                  Linked · {apiKey.slice(0, 10)}…
                </span>
                <button
                  type="button"
                  onClick={removeKey}
                  className="flex-none text-small font-medium text-text-tertiary transition-colors hover:text-danger"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') linkKey()
                  }}
                  placeholder="sk-or-v1-…"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-control border border-line-edge bg-ink-900 px-3 py-2 font-mono text-small text-text-primary placeholder:text-text-tertiary focus:border-line-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={linkKey}
                  disabled={!keyInput.trim()}
                  className="w-full rounded-[9px] bg-lumera-green py-2 text-small font-semibold text-ink-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Link key
                </button>
              </>
            )}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-small font-medium text-lumera-green"
            >
              Create a key on OpenRouter →
            </a>
          </div>

          {/* Model picker */}
          <div className="flex flex-col gap-2 rounded-card border border-line-edge bg-ink-800 p-4">
            <span className="font-mono text-micro leading-none font-medium tracking-[0.1em] text-text-tertiary uppercase">
              Model
            </span>
            {MODELS.map((m) => {
              const active = m.id === model
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={`flex items-start gap-2.5 rounded-control border px-3 py-2.5 text-left transition-colors ${active ? 'border-line-accent bg-lumera-teal/10' : 'border-line-edge hover:border-line-accent'}`}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 flex-none rounded-full border ${active ? 'border-lumera-green bg-lumera-green' : 'border-line-edge'}`}
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-mono text-small leading-tight text-text-primary [overflow-wrap:anywhere]">
                      {m.id}
                    </span>
                    <span className="text-[11px] leading-tight text-text-tertiary">{m.note}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Continue a saved chat */}
          <div className="flex flex-col gap-2 rounded-card border border-line-edge bg-ink-800 p-4">
            <span className="text-base font-medium text-text-primary">Continue a saved chat</span>
            <span className="text-small text-text-muted text-pretty">
              Paste the action_id of an archived session to rebuild it here.
            </span>
            <input
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void importFromActionId()
              }}
              placeholder="Paste an action_id or /action_id/<id>"
              className="w-full rounded-control border border-line-edge bg-ink-900 px-3 py-2 text-small text-text-primary placeholder:text-text-tertiary focus:border-line-accent focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void importFromActionId()}
                disabled={importing || !importInput.trim()}
                className="h-[36px] flex-none rounded-[9px] border border-line-edge bg-ink-600 px-3.5 text-small font-medium text-text-primary transition-colors hover:border-line-accent hover:text-lumera-green disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
              <span className="text-small text-text-tertiary">or</span>
              <label
                className={`flex h-[36px] flex-none items-center rounded-[9px] border border-line-edge bg-ink-600 px-3.5 text-small font-medium text-text-primary transition-colors hover:border-line-accent hover:text-lumera-green ${importing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
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
            {history.length > 0 ? (
              <div className="mt-1 flex flex-col gap-1.5">
                <span className="text-small text-text-tertiary">Saved on this wallet</span>
                <div className="flex flex-col overflow-hidden rounded-control border border-line-edge">
                  {history.map((h) => (
                    <div
                      key={h.actionId}
                      className="flex items-center gap-1 border-b border-line-hairline transition-colors last:border-b-0 hover:bg-ink-600"
                    >
                      <button
                        type="button"
                        onClick={() => void importFromActionId(h.actionId)}
                        disabled={importing}
                        title={`Open ${h.name} (action_id ${h.actionId})`}
                        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="w-full truncate text-small font-medium text-text-primary">
                          {h.name}
                        </span>
                        <span className="w-full truncate font-mono text-[11px] text-text-tertiary">
                          {[
                            relTime(h.savedAt),
                            `${h.messages} msg${h.messages === 1 ? '' : 's'}`,
                            h.attachments ? `${h.attachments} file${h.attachments === 1 ? '' : 's'}` : null,
                            h.actionId,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => forgetEntry(h.actionId)}
                        aria-label={`Remove ${h.name} from this list`}
                        title="Remove from this list"
                        className="flex-none px-2.5 py-2 text-small text-text-tertiary transition-colors hover:text-danger"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-text-tertiary">
                  This list is kept in this browser only — it points at your on-chain saves, it does not
                  store them.
                </span>
              </div>
            ) : null}
          </div>

          {/* Archive to Cascade */}
          <div className="flex flex-col gap-2.5 rounded-card border border-line-edge bg-ink-800 p-4">
            <span className="text-base font-medium text-text-primary">Archive to Cascade</span>
            <span className="text-small text-text-muted text-pretty">
              Signed by your wallet and stored under your own Cascade account — only you can open it.
              Returns an on-chain action_id.
            </span>
            <label className="flex flex-col gap-1.5">
              <span className="text-small text-text-tertiary">Name this chat</span>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Cascade design notes"
                maxLength={80}
                spellCheck={false}
                className="w-full rounded-control border border-line-edge bg-ink-900 px-3 py-2 text-small text-text-primary placeholder:text-text-tertiary focus:border-line-accent focus:outline-none"
              />
            </label>
            <div className="overflow-hidden rounded-control border border-line-edge">
              {[
                { k: 'Name', v: saveName.trim() || '—' },
                { k: 'Messages', v: `${messages.length} message${messages.length === 1 ? '' : 's'}` },
                { k: 'Attachments', v: String(attachments.length) },
                { k: 'Payload', v: messages.length || attachments.length ? sizeLabel(payloadBytes) : '—' },
                { k: 'Visibility', v: 'Private' },
              ].map((r) => (
                <div
                  key={r.k}
                  className="flex items-center justify-between gap-3 border-b border-line-hairline px-3 py-2 last:border-b-0"
                >
                  <span className="text-small text-text-tertiary">{r.k}</span>
                  <span className="font-mono text-small text-text-secondary">{r.v}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void saveToCascade()}
              disabled={saving || !canSave}
              className="w-full rounded-[9px] border border-line-edge bg-ink-600 py-2 text-small font-medium text-text-primary transition-colors hover:border-line-accent hover:text-lumera-green disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? savePhase
                  ? PHASE_LABEL[savePhase]
                  : 'Saving…'
                : walletReady
                  ? 'Save context to Cascade'
                  : 'Connect wallet to save'}
            </button>
            {!walletReady ? (
              <span className="text-small text-text-tertiary">
                Cascade save is signed by a Keplr wallet and billed to you — connect one to save.
              </span>
            ) : hasContent && !saveName.trim() ? (
              <span className="text-small text-text-tertiary">
                Give this chat a name to save it. It is stored privately under your wallet.
              </span>
            ) : null}
            {saveResult && 'actionId' in saveResult ? (
              <div className="rounded-control border border-line-edge bg-ink-600 px-3 py-2 text-small">
                <div className="text-text-secondary">
                  Archived · <code className="text-lumera-green">{saveResult.actionId}</code>
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
              <span className="text-small text-danger text-pretty">{saveResult.error}</span>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
