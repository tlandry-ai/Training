'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Loader2, Send, Link2, Search, Paperclip, X } from 'lucide-react'

type Attachment = { id: string; name: string; mediaType: string; url: string }

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// Downscale large photos to a sane size before sending. Keeps payloads small
// (phone photos can be many MB) and gives the model a clean, readable image.
async function prepareImage(
  file: File,
): Promise<{ url: string; mediaType: string }> {
  const dataUrl = await readAsDataUrl(file)
  try {
    const img = document.createElement('img')
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = dataUrl
    })
    const MAX = 1280
    const scale = Math.min(1, MAX / Math.max(img.width, img.height))
    if (scale === 1 && dataUrl.length < 700_000) {
      return { url: dataUrl, mediaType: file.type }
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return { url: dataUrl, mediaType: file.type }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { url: canvas.toDataURL('image/jpeg', 0.82), mediaType: 'image/jpeg' }
  } catch {
    // Fall back to the raw data URL if canvas processing fails.
    return { url: dataUrl, mediaType: file.type }
  }
}

const SUGGESTIONS = [
  'What should I eat post-workout today?',
  'Give me a high-protein breakfast idea',
  'Find a high-protein poke bowl recipe',
  'Am I on track with my macros today?',
]

function messageText(m: UIMessage): string {
  return (m.parts || [])
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('')
}

function messageImages(m: UIMessage): { url: string; name?: string }[] {
  return (m.parts || [])
    .filter(
      (p: any) =>
        p.type === 'file' &&
        typeof p.mediaType === 'string' &&
        p.mediaType.startsWith('image/'),
    )
    .map((p: any) => ({ url: p.url as string, name: p.filename as string }))
}

// Lightweight formatter: **bold**, [text](url) links, and paragraph/line breaks.
// Avoids pulling in a full markdown lib for a few simple cases.
function renderRichText(text: string) {
  const linkThenBold = /(\[([^\]]+)\]\((https?:\/\/[^)]+)\))|(\*\*([^*]+)\*\*)/g
  return text.split('\n').map((line, li) => {
    const nodes: React.ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    linkThenBold.lastIndex = 0
    while ((m = linkThenBold.exec(line)) !== null) {
      if (m.index > last) nodes.push(line.slice(last, m.index))
      if (m[1]) {
        nodes.push(
          <a
            key={`${li}-${m.index}`}
            href={m[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
          >
            {m[2]}
          </a>,
        )
      } else if (m[4]) {
        nodes.push(
          <strong key={`${li}-${m.index}`} className="font-semibold">
            {m[5]}
          </strong>,
        )
      }
      last = m.index + m[0].length
    }
    if (last < line.length) nodes.push(line.slice(last))
    return (
      <span key={li}>
        {nodes}
        {'\n'}
      </span>
    )
  })
}

// Tool-call chips so Temple can see Josie "working".
function ToolChips({ message }: { message: UIMessage }) {
  const chips: { icon: 'link' | 'search'; label: string; done: boolean }[] = []
  for (const p of message.parts || []) {
    const t = (p as any).type as string
    if (t === 'tool-fetchRecipe') {
      chips.push({
        icon: 'link',
        label: 'Reading link',
        done: (p as any).state === 'output-available',
      })
    } else if (t === 'tool-searchWeb') {
      chips.push({
        icon: 'search',
        label: `Searching the web`,
        done: (p as any).state === 'output-available',
      })
    }
  }
  if (chips.length === 0) return null
  return (
    <div className="mb-1.5 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-ink-soft"
        >
          {c.icon === 'link' ? (
            <Link2 className="h-3 w-3" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          {c.label}
          {!c.done && <Loader2 className="h-3 w-3 animate-spin" />}
        </span>
      ))}
    </div>
  )
}

export default function AskJosie() {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/coach-chat' }),
  })

  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, status])

  async function handleFiles(list: FileList | null) {
    if (!list) return
    const images = Array.from(list).filter((f) => f.type.startsWith('image/'))
    const results = await Promise.allSettled(
      images.map(async (f) => {
        const { url, mediaType } = await prepareImage(f)
        return {
          id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2)}`,
          name: f.name,
          mediaType,
          url,
        }
      }),
    )
    const next = results
      .filter(
        (r): r is PromiseFulfilledResult<Attachment> => r.status === 'fulfilled',
      )
      .map((r) => r.value)
    if (next.length > 0) setAttachments((prev) => [...prev, ...next])
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  function submit(text: string) {
    const trimmed = text.trim()
    if ((!trimmed && attachments.length === 0) || busy) return
    sendMessage({
      text: trimmed || 'Take a look at this and tell me how it fits my plan.',
      files: attachments.map((a) => ({
        type: 'file' as const,
        mediaType: a.mediaType,
        url: a.url,
        filename: a.name,
      })),
    })
    setInput('')
    setAttachments([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex h-[70vh] min-h-[440px] flex-col rounded-lg border border-border bg-paper">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-serif text-[16px] font-semibold text-oat">
          J
        </span>
        <div>
          <div className="font-serif text-[16px] font-semibold leading-none text-ink">
            Coach Josie
          </div>
          <div className="mt-0.5 font-sans text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            Ask about food, macros & workouts
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="pt-2">
            <p className="font-serif text-[15px] italic leading-relaxed text-ink-soft">
              Hey Temple! Ask me anything about your plan — swaps, recipes,
              macros, or a lift. Paste a TikTok or Instagram recipe link, or
              snap a photo of your meal, a menu, or a recipe and I&apos;ll break
              it down to fit your goals.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-lg border border-border bg-secondary px-3 py-2 text-left font-sans text-[13px] text-ink active:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user'
          const text = messageText(m)
          const images = messageImages(m)
          return (
            <div
              key={m.id}
              className={isUser ? 'flex justify-end' : 'flex justify-start'}
            >
              <div className={isUser ? 'max-w-[85%]' : 'max-w-[92%]'}>
                {!isUser && <ToolChips message={m} />}
                {images.length > 0 && (
                  <div
                    className={`mb-1.5 flex flex-wrap gap-1.5 ${isUser ? 'justify-end' : ''}`}
                  >
                    {images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img.url || '/placeholder.svg'}
                        alt={img.name || 'Attached image'}
                        className="h-28 w-28 rounded-xl border border-border object-cover"
                      />
                    ))}
                  </div>
                )}
                {(text || !isUser) && (
                <div
                  className={
                    isUser
                      ? 'rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 font-sans text-[14px] leading-relaxed text-oat'
                      : 'rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2.5 font-sans text-[14px] leading-relaxed text-ink'
                  }
                >
                  {text ? (
                    <div className="whitespace-pre-wrap">
                      {renderRichText(text)}
                    </div>
                  ) : (
                    !isUser && (
                      <span className="inline-flex items-center gap-2 text-ink-soft">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Thinking…
                      </span>
                    )
                  )}
                </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-3 py-3">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <div key={a.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url || '/placeholder.svg'}
                  alt={a.name}
                  className="h-16 w-16 rounded-lg border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label={`Remove ${a.name}`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-oat"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="Attach photo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-30"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                submit(input)
              }
            }}
            rows={1}
            placeholder="Ask Josie, paste a link, or attach a photo…"
            className="max-h-28 flex-1 resize-none rounded-xl border border-border bg-secondary px-3.5 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-soft/70 focus:border-ink"
          />
          <button
            onClick={() => submit(input)}
            disabled={busy || (!input.trim() && attachments.length === 0)}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-oat disabled:opacity-30"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
