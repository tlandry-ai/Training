'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Mic } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey, getScheduleForDate, silkClass } from '@/lib/plan'
import { verseForDate } from '@/lib/verses'
import { Panel, Eyebrow, EyebrowRow, Track } from '@/components/ui-kit'
import MealCapture from '@/components/capture/meal-capture'
import AudioCapture from '@/components/capture/audio-capture'

const TODAY_HABITS = [
  { key: 'sleep', label: 'Sleep', color: 'var(--blue)' },
  { key: 'water', label: 'Water', color: 'var(--rose)' },
  { key: 'recovery', label: 'Recovery', color: 'var(--butter)' },
  { key: 'scripture', label: 'Scripture', color: 'var(--green)' },
  { key: 'steps', label: 'Steps', color: 'var(--ink)' },
]

export default function TodayTab() {
  const supabase = getSupabase()
  const today = new Date()
  const key = dateKey(today)
  const verse = verseForDate(today)
  const schedule = getScheduleForDate(today)

  const [done, setDone] = useState<Set<string>>(new Set())
  const [habits, setHabits] = useState<Set<string>>(new Set())
  const [gratitude, setGratitude] = useState('')
  const [gratId, setGratId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<null | 'meal' | 'audio'>(null)
  const gratTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const [checkRes, habitRes, gratRes] = await Promise.all([
      supabase.from('checkins').select('block_id').eq('date_key', key),
      supabase.from('habit_log').select('habit, done').eq('date_key', key),
      supabase
        .from('notes')
        .select('id, text')
        .eq('date_key', key)
        .order('created_at', { ascending: true })
        .limit(1),
    ])
    setDone(new Set((checkRes.data || []).map((r: any) => r.block_id)))
    setHabits(
      new Set(
        (habitRes.data || [])
          .filter((r: any) => r.done)
          .map((r: any) => r.habit),
      ),
    )
    if (gratRes.data && gratRes.data[0]) {
      setGratitude(gratRes.data[0].text)
      setGratId(gratRes.data[0].id)
    }
    setLoading(false)
  }, [supabase, key])

  useEffect(() => {
    load()
  }, [load])

  async function toggleBlock(id: string) {
    const next = new Set(done)
    if (next.has(id)) {
      next.delete(id)
      setDone(next)
      await supabase
        .from('checkins')
        .delete()
        .match({ date_key: key, block_id: id })
    } else {
      next.add(id)
      setDone(next)
      await supabase
        .from('checkins')
        .upsert(
          { date_key: key, block_id: id, done: true },
          { onConflict: 'date_key,block_id' },
        )
    }
  }

  async function toggleHabit(habitKey: string) {
    const next = new Set(habits)
    const on = !next.has(habitKey)
    if (on) next.add(habitKey)
    else next.delete(habitKey)
    setHabits(next)
    await supabase
      .from('habit_log')
      .upsert(
        { date_key: key, habit: habitKey, done: on },
        { onConflict: 'date_key,habit' },
      )
  }

  function onGratitude(text: string) {
    setGratitude(text)
    if (gratTimer.current) clearTimeout(gratTimer.current)
    gratTimer.current = setTimeout(async () => {
      if (gratId) {
        await supabase.from('notes').update({ text }).eq('id', gratId)
      } else if (text.trim()) {
        const { data } = await supabase
          .from('notes')
          .insert({ date_key: key, text })
          .select('id')
          .single()
        if (data) setGratId(data.id)
      }
    }, 700)
  }

  const doneCount = schedule.filter((b) => done.has(b.id)).length

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <>
      {/* Verse + gratitude */}
      <Panel>
        <Eyebrow>Verse — Today</Eyebrow>
        <p className="verse-text">
          {verse.text}
          <cite className="verse-cite">{verse.ref}</cite>
        </p>
        <textarea
          className="grat-input"
          rows={2}
          value={gratitude}
          onChange={(e) => onGratitude(e.target.value)}
          placeholder="One thing you're grateful for."
        />
      </Panel>

      {/* Schedule */}
      <Panel>
        <EyebrowRow label="Today" right={`${doneCount} / ${schedule.length}`} />
        <Track
          pct={schedule.length ? (doneCount / schedule.length) * 100 : 0}
        />
        <div>
          {schedule.map((b) => {
            const isDone = done.has(b.id)
            return (
              <div
                key={b.id}
                className={`sched-item ${isDone ? 'done' : ''}`}
                tabIndex={0}
                role="button"
                aria-pressed={isDone}
                onClick={() => toggleBlock(b.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    toggleBlock(b.id)
                  }
                }}
              >
                <span className="sched-box" />
                <span className={`silk ${silkClass(b.type)}`} />
                <span className="sched-body">
                  <span className="sched-name">{b.label}</span>
                  <span className="sched-time">{b.time}</span>
                </span>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Capture */}
      <Panel>
        <Eyebrow>Capture</Eyebrow>
        <div className="capture-grid">
          <button className="cap-launch" onClick={() => setSheet('meal')}>
            <Camera className="h-5 w-5" />
            <span className="cap-launch-lbl">Photograph a meal</span>
            <span className="cap-launch-sub">Fuel read, not a calorie count</span>
          </button>
          <button className="cap-launch" onClick={() => setSheet('audio')}>
            <Mic className="h-5 w-5" />
            <span className="cap-launch-lbl">Talk through training</span>
            <span className="cap-launch-sub">Files itself under the event</span>
          </button>
        </div>
      </Panel>

      {/* Habits */}
      <Panel>
        <EyebrowRow
          label="Habits"
          right={`${habits.size} / ${TODAY_HABITS.length}`}
        />
        <div className="habit-row">
          {TODAY_HABITS.map((h) => {
            const on = habits.has(h.key)
            return (
              <button
                key={h.key}
                className={`habit-cell ${on ? 'on' : ''}`}
                onClick={() => toggleHabit(h.key)}
                aria-pressed={on}
              >
                <span className="habit-dot" style={{ background: h.color }} />
                <span className="habit-nm">{h.label}</span>
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Coach */}
      <Panel dark>
        <Eyebrow muted>Coach</Eyebrow>
        <p className="coach-quiet">
          Nothing worth saying yet. I&apos;ll speak up once there&apos;s about{' '}
          <b>two weeks</b> of logs to read — and only about patterns you actually
          put here.
        </p>
      </Panel>

      {sheet === 'meal' && (
        <MealCapture onClose={() => setSheet(null)} onSaved={load} />
      )}
      {sheet === 'audio' && (
        <AudioCapture onClose={() => setSheet(null)} onSaved={load} />
      )}
    </>
  )
}
