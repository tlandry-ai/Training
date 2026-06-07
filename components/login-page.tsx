'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

type Polaroid = {
  src: string
  label: string
  top?: string
  left?: string
  right?: string
  bottom?: string
  rot: number
}

const DEFAULT_POLAROIDS: Polaroid[] = [
  { src: '/polaroids/gym-1.png', label: 'beam', top: '8%', left: '6%', rot: -8 },
  { src: '/polaroids/gym-2.png', label: 'grips', top: '14%', right: '8%', rot: 7 },
  { src: '/polaroids/gym-3.png', label: 'sunrise run', bottom: '10%', left: '10%', rot: 6 },
  { src: '/polaroids/gym-4.png', label: 'fuel', bottom: '12%', right: '7%', rot: -6 },
]

const POSITIONS = [
  { top: '8%', left: '6%', rot: -8 },
  { top: '14%', right: '8%', rot: 7 },
  { bottom: '10%', left: '10%', rot: 6 },
  { bottom: '12%', right: '7%', rot: -6 },
]

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [polaroids, setPolaroids] = useState<Polaroid[]>(DEFAULT_POLAROIDS)

  useEffect(() => {
    async function loadBoard() {
      try {
        const supabase = getSupabase()
        const { data } = await supabase.storage
          .from('vision-board')
          .list('', { sortBy: { column: 'created_at', order: 'desc' }, limit: 4 })
        const items = (data || []).filter(
          (f) => f.name !== '.emptyFolderPlaceholder',
        )
        if (items.length === 0) return
        const mapped: Polaroid[] = items.map((f, i) => {
          const { data: pub } = supabase.storage
            .from('vision-board')
            .getPublicUrl(f.name)
          return { src: pub.publicUrl, label: 'vision', ...POSITIONS[i % 4] }
        })
        setPolaroids(mapped)
      } catch {
        /* keep defaults */
      }
    }
    loadBoard()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Incorrect password.')
        setLoading(false)
        return
      }
      window.location.reload()
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      {/* Scattered polaroids */}
      {polaroids.map((p, idx) => (
        <figure
          key={`${p.label}-${idx}`}
          className="pointer-events-none absolute hidden w-44 rotate-0 bg-card p-2 pb-6 shadow-xl sm:block"
          style={{
            top: p.top,
            left: p.left,
            right: p.right,
            bottom: p.bottom,
            transform: `rotate(${p.rot}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.src || '/placeholder.svg'}
            alt={p.label}
            className="aspect-square w-full object-cover"
          />
          <figcaption className="mt-2 text-center font-mono text-xs lowercase text-muted-foreground">
            {p.label}
          </figcaption>
        </figure>
      ))}

      {/* Frosted glass login card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h1 className="font-script text-4xl leading-tight text-foreground">
            {"Temple's Summer Plan"}
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Train · Track · Become
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="w-full rounded-xl border border-border bg-card/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="mt-1 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Unlocking…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  )
}
