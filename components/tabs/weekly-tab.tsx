'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey, getScheduleForDate } from '@/lib/plan'
import { SectionCard } from '@/components/ui-kit'

interface Stats {
  completionPct: number
  sessions: number
  meals: number
  skillEntries: number
  extraWorkouts: number
  notes: number
}

export default function WeeklyTab() {
  const supabase = getSupabase()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentNotes, setRecentNotes] = useState<{ text: string; date_key: string }[]>(
    [],
  )
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d
  })
  const keys = weekDates.map(dateKey)

  useEffect(() => {
    async function load() {
      const [checks, meals, skillEntries, workouts, notes] = await Promise.all([
        supabase.from('checkins').select('date_key, block_id, done').in('date_key', keys),
        supabase.from('food_log').select('id').in('date_key', keys),
        supabase.from('practice_entries').select('id').in('date_key', keys),
        supabase.from('workout_log').select('id').in('date_key', keys),
        supabase
          .from('notes')
          .select('text, date_key')
          .in('date_key', keys)
          .order('created_at', { ascending: false }),
      ])

      // completion %
      let total = 0
      let completed = 0
      let sessionCount = 0
      for (const d of weekDates) {
        const sched = getScheduleForDate(d)
        if (sched.length === 1 && sched[0].type === 'Rest') continue
        total += sched.length
        const dk = dateKey(d)
        const doneSet = new Set(
          (checks.data || [])
            .filter((r: any) => r.date_key === dk && r.done)
            .map((r: any) => r.block_id),
        )
        completed += sched.filter((b) => doneSet.has(b.id)).length
      }
      sessionCount = (checks.data || []).filter(
        (r: any) => r.done && r.block_id !== 'rest',
      ).length

      setStats({
        completionPct: total ? Math.round((completed / total) * 100) : 0,
        sessions: sessionCount,
        meals: (meals.data || []).length,
        skillEntries: (skillEntries.data || []).length,
        extraWorkouts: (workouts.data || []).length,
        notes: (notes.data || []).length,
      })
      setRecentNotes((notes.data || []) as any)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateReview() {
    if (!stats) return
    setLoading(true)
    setReview('')
    const statsStr = [
      `Completion: ${stats.completionPct}%`,
      `Sessions completed: ${stats.sessions}`,
      `Meals logged: ${stats.meals}`,
      `Skill practice entries: ${stats.skillEntries}`,
      `Extra workouts: ${stats.extraWorkouts}`,
      `Notes written: ${stats.notes}`,
    ].join('\n')
    const notesStr = recentNotes.map((n) => `- ${n.text}`).join('\n')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'weekly-review',
          payload: { stats: statsStr, notes: notesStr },
        }),
      })
      const data = await res.json()
      setReview(data.text || data.error || 'No review available.')
    } catch {
      setReview('Could not generate review.')
    } finally {
      setLoading(false)
    }
  }

  const cards = stats
    ? [
        { label: 'Completion', value: `${stats.completionPct}%` },
        { label: 'Sessions', value: stats.sessions },
        { label: 'Meals Logged', value: stats.meals },
        { label: 'Skill Entries', value: stats.skillEntries },
        { label: 'Extra Workouts', value: stats.extraWorkouts },
        { label: 'Notes', value: stats.notes },
      ]
    : []

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Last 7 Days">
        {!stats ? (
          <p className="text-sm text-muted-foreground">Crunching numbers…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-xl bg-accent/40 px-4 py-5 text-center"
              >
                <div className="font-serif text-3xl text-foreground">
                  {c.value}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* AI weekly review */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Weekly Review
          </h2>
          <button
            onClick={generateReview}
            disabled={loading || !stats}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Generate
          </button>
        </div>
        {review ? (
          <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-foreground text-pretty">
            {review}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {loading
              ? 'Reviewing your week…'
              : 'Generate an AI summary of your week plus one adjustment for next week.'}
          </p>
        )}
      </div>

      <SectionCard title="Recent Notes">
        {recentNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notes logged this week.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentNotes.map((n, i) => (
              <li
                key={i}
                className="rounded-xl bg-accent/40 px-4 py-2.5 text-sm text-foreground"
              >
                <span className="mr-2 font-mono text-[10px] uppercase text-muted-foreground">
                  {n.date_key}
                </span>
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
