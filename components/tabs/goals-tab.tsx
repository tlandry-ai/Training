'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { GOAL_CATEGORIES } from '@/lib/plan'
import { Panel, Eyebrow, EyebrowRow, Track, Silk } from '@/components/ui-kit'

interface Goal {
  id: string
  title: string
  cat: string
  deadline: string | null
  note: string | null
  done: boolean
  progress?: number | null
}

// Map a goal category to a ticket-stripe color.
const CAT_SILK: Record<string, string> = {
  Gymnastics: 'silk-rose',
  Fitness: 'silk-green',
  Skills: 'silk-butter',
  Life: 'silk-blue',
}

export default function GoalsTab({ onChange }: { onChange?: () => void }) {
  const supabase = getSupabase()
  const [goals, setGoals] = useState<Goal[]>([])
  const [adding, setAdding] = useState(false)

  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('Gymnastics')
  const [deadline, setDeadline] = useState('')
  const [note, setNote] = useState('')
  const [measurable, setMeasurable] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: true })
      setGoals((data || []) as any)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addGoal() {
    const t = title.trim()
    if (!t) return
    const { data } = await supabase
      .from('goals')
      .insert({
        title: t,
        cat,
        deadline: deadline || null,
        note: note.trim() || null,
        done: false,
        progress: measurable ? 0 : null,
      })
      .select('*')
      .single()
    if (data) setGoals((p) => [...p, data as any])
    setTitle('')
    setDeadline('')
    setNote('')
    setMeasurable(false)
    setAdding(false)
    onChange?.()
  }

  async function toggle(g: Goal) {
    const next = !g.done
    setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, done: next } : x)))
    await supabase.from('goals').update({ done: next }).eq('id', g.id)
    onChange?.()
  }

  async function setProgress(g: Goal, value: number) {
    const v = Math.max(0, Math.min(100, value))
    setGoals((p) =>
      p.map((x) =>
        x.id === g.id ? { ...x, progress: v, done: v >= 100 } : x,
      ),
    )
    await supabase
      .from('goals')
      .update({ progress: v, done: v >= 100 })
      .eq('id', g.id)
    onChange?.()
  }

  async function remove(id: string) {
    setGoals((p) => p.filter((g) => g.id !== id))
    await supabase.from('goals').delete().eq('id', id)
    onChange?.()
  }

  return (
    <div>
      <Panel>
        <EyebrowRow label="Goals" right={String(goals.length)} />
        {goals.length === 0 && (
          <p className="py-1.5 text-sm text-ink-soft">
            No goals yet. Add your first below.
          </p>
        )}
        {goals.map((g) => {
          const silk = CAT_SILK[g.cat] || 'silk-ink'
          const isMeasurable = g.progress != null
          return (
            <div key={g.id} className="goal-block">
              <div className="goal-top-row">
                {!isMeasurable ? (
                  <button
                    onClick={() => toggle(g)}
                    aria-label="Toggle goal complete"
                    className={`sched-box ${g.done ? 'is-done' : ''}`}
                  />
                ) : (
                  <Silk variant={silk} />
                )}
                <span
                  className={`goal-name ${g.done ? 'goal-done' : ''}`}
                >
                  {g.title}
                </span>
                {isMeasurable && (
                  <span className="goal-num">{g.progress}%</span>
                )}
                <button
                  onClick={() => remove(g.id)}
                  aria-label="Delete goal"
                  className="goal-del"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {isMeasurable && (
                <>
                  <div className="mt-2.5">
                    <Track pct={g.progress || 0} />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={g.progress || 0}
                    onChange={(e) => setProgress(g, Number(e.target.value))}
                    className="goal-range"
                    aria-label="Goal progress"
                  />
                </>
              )}

              <div className="goal-due">
                {g.cat}
                {g.deadline ? ` · due ${g.deadline}` : ''}
                {g.note ? ` · ${g.note}` : ''}
              </div>
            </div>
          )
        })}
      </Panel>

      <Panel>
        {!adding ? (
          <>
            <Eyebrow>Add a goal</Eyebrow>
            <p className="mb-3 text-sm leading-relaxed text-ink-soft">
              Measurable ones get a bar. Everything else gets a box. That&apos;s
              the whole system.
            </p>
            <button onClick={() => setAdding(true)} className="add-goal-btn">
              <Plus className="h-4 w-4" /> New goal
            </button>
          </>
        ) : (
          <>
            <EyebrowRow
              label="New goal"
              right={
                <button
                  onClick={() => setAdding(false)}
                  aria-label="Cancel"
                  className="cap-x"
                >
                  <X className="h-4 w-4" />
                </button>
              }
            />
            <div className="flex flex-col gap-2.5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you working toward?"
                className="field"
              />
              <div className="flex gap-2.5">
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="field flex-1"
                >
                  {GOAL_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="field flex-1 text-ink-soft"
                />
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="field"
              />
              <label className="flex items-center gap-2.5 py-1">
                <button
                  type="button"
                  onClick={() => setMeasurable((m) => !m)}
                  aria-pressed={measurable}
                  className={`sched-box ${measurable ? 'is-done' : ''}`}
                />
                <span className="text-sm text-ink">
                  Track this one with a progress bar
                </span>
              </label>
              <button onClick={addGoal} className="add-goal-btn justify-center">
                <Plus className="h-4 w-4" /> Add goal
              </button>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
