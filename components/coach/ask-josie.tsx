'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Loader2, Send, Link2, Search } from 'lucide-react'

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
  const scrollRef = useRef<HTMLDivElement>(null)
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

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    sendMessage({ text: trimmed })
    setInput('')
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
              macros, or a lift. Paste a TikTok or Instagram recipe link and
              I&apos;ll make it fit your goals.
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
          return (
            <div
              key={m.id}
              className={isUser ? 'flex justify-end' : 'flex justify-start'}
            >
              <div className={isUser ? 'max-w-[85%]' : 'max-w-[92%]'}>
                {!isUser && <ToolChips message={m} />}
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
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-end gap-2">
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
            placeholder="Ask Josie, or paste a recipe link…"
            className="max-h-28 flex-1 resize-none rounded-xl border border-border bg-secondary px-3.5 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-soft/70 focus:border-ink"
          />
          <button
            onClick={() => submit(input)}
            disabled={busy || !input.trim()}
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
