'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles, Loader2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import {
  dateKey,
  getScheduleForDate,
  BLOCK_COLORS,
} from '@/lib/plan'
import { ProgressBar, SectionCard, Pill } from '@/components/ui-kit'

export default function TodayTab({ onChange }: { onChange?: () => void }) {
  const today = new Date()
  const key = dateKey(today)
  const schedule = getScheduleForDate(today)
  const isRest = schedule.length === 1 && schedule[0].type === 'Rest'

  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<{ id: string; text: string }[]>([])
  const [noteInput, setNoteInput] = useState('')
  const [brief, setBrief] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)

  const supabase = getSupabase()

  useEffect(() => {
    async function load() {
      const { data: checks } = await supabase
        .from('checkins')
        .select('block_id, done')
        .eq('date_key', key)
      const s = new Set<string>()
      ;(checks || []).forEach((r: any) => {
        if (r.done) s.add(r.block_id)
      })
      setDone(s)

      const { data: noteRows } = await supabase
        .from('notes')
        .select('id, text')
        .eq('date_key', key)
        .order('created_at', { ascending: false })
      setNotes((noteRows || []) as any)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  async function toggle(blockId: string) {
    const next = new Set(done)
    const nowDone = !next.has(blockId)
    if (nowDone) next.add(blockId)
    else next.delete(blockId)
    setDone(next)

    await supabase
      .from('checkins')
      .upsert(
        { date_key: key, block_id: blockId, done: nowDone },
        { onConflict: 'date_key,block_id' },
      )
    onChange?.()
  }

  async function addNote() {
    const text = noteInput.trim()
    if (!text) return
    setNoteInput('')
    const { data } = await supabase
      .from('notes')
      .insert({ date_key: key, text })
      .select('id, text')
      .single()
    if (data) setNotes((n) => [data as any, ...n])
  }

  async function generateBrief() {
    setBriefLoading(true)
    setBrief('')
    try {
      // last 7 days completion
      const dates: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(dateKey(d))
      }
      const { data: weekChecks } = await supabase
        .from('checkins')
        .select('date_key, block_id, done')
        .in('date_key', dates)

      let total = 0
      let completed = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const sched = getScheduleForDate(d)
        if (sched.length === 1 && sched[0].type === 'Rest') continue
        total += sched.length
        const dk = dateKey(d)
        const doneSet = new Set(
          (weekChecks || [])
            .filter((r: any) => r.date_key === dk && r.done)
            .map((r: any) => r.block_id),
        )
        completed += sched.filter((b) => doneSet.has(b.id)).length
      }
      const pct = total ? Math.round((completed / total) * 100) : 0

      const { data: recent } = await supabase
        .from('notes')
        .select('text')
        .order('created_at', { ascending: false })
        .limit(5)
      const recentNotes = (recent || []).map((n: any) => `- ${n.text}`).join('\n')

      const scheduleStr = schedule
        .map((b) => `${b.time} — ${b.label}`)
        .join('\n')

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'daily-brief',
          payload: {
            schedule: scheduleStr,
            completionPct: pct,
            recentNotes,
            dayLabel: today.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
          },
        }),
      })
      const data = await res.json()
      setBrief(data.text || data.error || 'Could not generate brief.')
    } catch {
      setBrief('Could not generate brief.')
    } finally {
      setBriefLoading(false)
    }
  }

  const trackable = schedule.filter((b) => b.type !== 'Rest')
  const completedCount = trackable.filter((b) => done.has(b.id)).length
  const pct = trackable.length
    ? Math.round((completedCount / trackable.length) * 100)
    : 0

  return (
    <div className="flex flex-col gap-5">
      {/* AI daily brief */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Daily Brief
          </h2>
          <button
            onClick={generateBrief}
            disabled={briefLoading}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {briefLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Generate
          </button>
        </div>
        {brief ? (
          <p className="font-serif text-lg leading-relaxed text-foreground text-pretty">
            {brief}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {briefLoading
              ? 'Reading your week…'
              : 'Tap generate for your AI morning brief based on today’s plan and your recent week.'}
          </p>
        )}
      </div>

      {/* Schedule */}
      <SectionCard title={isRest ? 'Today — Rest Day' : "Today's Schedule"}>
        {!isRest && (
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>{completedCount} of {trackable.length} complete</span>
              <span>{pct}%</span>
            </div>
            <ProgressBar value={pct} />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isRest ? (
          <div className="rounded-xl bg-accent/60 px-4 py-8 text-center">
            <p className="font-serif text-2xl text-foreground">Rest & Recover</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No scheduled training today. Hydrate, stretch, and let the body
              rebuild.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {schedule.map((b) => {
              const isDone = done.has(b.id)
              const c = BLOCK_COLORS[b.type]
              return (
                <li key={b.id}>
                  <button
                    onClick={() => toggle(b.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      isDone
                        ? 'border-transparent'
                        : 'border-border bg-card hover:bg-accent/40'
                    }`}
                    style={
                      isDone
                        ? { backgroundColor: c.bg }
                        : undefined
                    }
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: c.text,
                        backgroundColor: isDone ? c.text : 'transparent',
                      }}
                    >
                      {isDone && (
                        <Check
                          className="h-3.5 w-3.5"
                          style={{ color: c.bg }}
                        />
                      )}
                    </span>
                    <div className="flex-1">
                      <div
                        className="font-medium leading-tight"
                        style={{ color: isDone ? c.text : undefined }}
                      >
                        {b.label}
                      </div>
                      <div
                        className="font-mono text-[11px]"
                        style={{
                          color: isDone ? c.text : 'var(--muted-foreground)',
                          opacity: isDone ? 0.8 : 1,
                        }}
                      >
                        {b.time}
                      </div>
                    </div>
                    <Pill type={b.type} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {/* Coach notes */}
      <SectionCard title="Coach Notes & Log">
        <div className="mb-4 flex gap-2">
          <input
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="How did today feel? Anything to remember…"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <button
            onClick={addNote}
            className="rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
          >
            Add
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-xl bg-accent/50 px-3 py-2 text-sm text-foreground"
              >
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
