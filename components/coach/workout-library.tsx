'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey } from '@/lib/plan'
import { WORKOUTS, type WorkoutDay, type Exercise } from '@/lib/coach'
import { SectionCard } from '@/components/ui-kit'

interface LogRow {
  id: string
  date_key: string
  day_key: string
  exercise: string
  set_index: number
  weight: number | null
  reps: number | null
  created_at: string
}

export default function WorkoutLibrary() {
  const supabase = getSupabase()
  const today = dateKey(new Date())
  const [openDay, setOpenDay] = useState<string>(WORKOUTS[0].key)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('exercise_log')
        .select('id, date_key, day_key, exercise, set_index, weight, reps, created_at')
        .order('created_at', { ascending: true })
        .limit(500)
      if (!active) return
      setLogs((data || []) as unknown as LogRow[])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function logSet(
    day: WorkoutDay,
    ex: Exercise,
    weight: number | null,
    reps: number | null,
  ) {
    const existing = logs.filter(
      (l) => l.date_key === today && l.exercise === ex.name,
    )
    const set_index = existing.length + 1
    const { data } = await supabase
      .from('exercise_log')
      .insert({
        date_key: today,
        day_key: day.label,
        exercise: ex.name,
        set_index,
        weight,
        reps,
      })
      .select('id, date_key, day_key, exercise, set_index, weight, reps, created_at')
      .single()
    if (data) setLogs((prev) => [...prev, data as unknown as LogRow])
  }

  async function removeSet(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id))
    await supabase.from('exercise_log').delete().eq('id', id)
  }

  return (
    <SectionCard title="Workout Library">
      {loading ? (
        <p className="flex items-center gap-2 py-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <div className="space-y-2">
          {WORKOUTS.map((day) => {
            const open = openDay === day.key
            return (
              <div
                key={day.key}
                className="overflow-hidden rounded-lg border border-border"
              >
                <button
                  onClick={() => setOpenDay(open ? '' : day.key)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between bg-secondary px-3.5 py-3 text-left"
                >
                  <span className="font-serif text-[16px] font-semibold text-ink">
                    {day.label}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-ink-soft transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <div className="px-3.5 pb-3 pt-1">
                    {day.exercises.map((ex) => (
                      <ExerciseRow
                        key={ex.name}
                        day={day}
                        exercise={ex}
                        today={today}
                        logs={logs}
                        onLog={logSet}
                        onRemove={removeSet}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function ExerciseRow({
  day,
  exercise,
  today,
  logs,
  onLog,
  onRemove,
}: {
  day: WorkoutDay
  exercise: Exercise
  today: string
  logs: LogRow[]
  onLog: (
    day: WorkoutDay,
    ex: Exercise,
    weight: number | null,
    reps: number | null,
  ) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const todaySets = useMemo(
    () =>
      logs
        .filter((l) => l.date_key === today && l.exercise === exercise.name)
        .sort((a, b) => a.set_index - b.set_index),
    [logs, today, exercise.name],
  )

  const lastWeight = useMemo(() => {
    const prior = logs
      .filter((l) => l.exercise === exercise.name && l.date_key !== today && l.weight != null)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    return prior[0]?.weight ?? null
  }, [logs, today, exercise.name])

  function submit() {
    const w = weight.trim() === '' ? null : Number(weight)
    const r = reps.trim() === '' ? null : Number(reps)
    if (w == null && r == null) return
    onLog(day, exercise, w, r)
    setWeight('')
    setReps('')
  }

  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <span className="flex-1">
          <span className="block text-[15px] font-medium leading-snug text-ink">
            {exercise.name}
          </span>
          <span className="mt-0.5 block font-sans text-[11px] text-ink-soft">
            {exercise.sets} sets · {exercise.reps} reps
            {lastWeight != null && (
              <span className="ml-2 text-ink">· last {lastWeight} lb</span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {todaySets.length > 0 && (
            <span className="rounded-full bg-green px-2 py-0.5 font-sans text-[10px] font-bold text-paper">
              {todaySets.length} logged
            </span>
          )}
          <Plus
            className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
              open ? 'rotate-45' : ''
            }`}
          />
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {todaySets.length > 0 && (
            <div className="mb-2.5 space-y-1">
              {todaySets.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5"
                >
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                    Set {s.set_index}
                  </span>
                  <span className="flex-1 font-serif text-[14px] text-ink">
                    {s.weight != null ? `${s.weight} lb` : '—'}
                    {s.reps != null ? ` × ${s.reps}` : ''}
                  </span>
                  <button
                    onClick={() => onRemove(s.id)}
                    aria-label="Remove set"
                    className="flex h-6 w-6 items-center justify-center text-ink-soft transition active:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="Weight (lb)"
              className="field w-full flex-1"
            />
            <input
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
              }}
              inputMode="numeric"
              placeholder="Reps"
              className="field w-20 shrink-0"
            />
            <button
              onClick={submit}
              className="shrink-0 rounded-lg bg-green px-4 font-sans text-[13px] font-semibold text-paper"
            >
              Log
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
