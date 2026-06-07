'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { GOAL_CATEGORIES } from '@/lib/plan'
import { ProgressBar, SectionCard } from '@/components/ui-kit'

interface Goal {
  id: string
  title: string
  cat: string
  deadline: string | null
  note: string | null
  done: boolean
}

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  Gymnastics: { bg: '#EBD4F5', text: '#4a1a7a' },
  Fitness: { bg: '#D4E4F5', text: '#1a4a7a' },
  Skills: { bg: '#F5E6D4', text: '#7a3d1a' },
  Life: { bg: '#D4F5F0', text: '#1a6a5a' },
}

export default function GoalsTab({ onChange }: { onChange?: () => void }) {
  const supabase = getSupabase()
  const [goals, setGoals] = useState<Goal[]>([])
  const [filter, setFilter] = useState<string>('All')

  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('Gymnastics')
  const [deadline, setDeadline] = useState('')
  const [note, setNote] = useState('')

  const [nudge, setNudge] = useState('')
  const [nudgeLoading, setNudgeLoading] = useState(false)

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
      })
      .select('*')
      .single()
    if (data) setGoals((p) => [...p, data as any])
    setTitle('')
    setDeadline('')
    setNote('')
    onChange?.()
  }

  async function toggle(g: Goal) {
    const next = !g.done
    setGoals((p) => p.map((x) => (x.id === g.id ? { ...x, done: next } : x)))
    await supabase.from('goals').update({ done: next }).eq('id', g.id)
    onChange?.()
  }

  async function remove(id: string) {
    setGoals((p) => p.filter((g) => g.id !== id))
    await supabase.from('goals').delete().eq('id', id)
    onChange?.()
  }

  async function generateNudge() {
    setNudgeLoading(true)
    setNudge('')
    const open = goals.filter((g) => !g.done)
    const list = open
      .map((g) => `${g.title} | ${g.cat} | ${g.deadline || 'no deadline'}`)
      .join('\n')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'goal-nudge', payload: { goals: list } }),
      })
      const data = await res.json()
      setNudge(data.text || data.error || 'No nudge available.')
    } catch {
      setNudge('Could not generate a nudge.')
    } finally {
      setNudgeLoading(false)
    }
  }

  const filtered =
    filter === 'All' ? goals : goals.filter((g) => g.cat === filter)
  const doneCount = goals.filter((g) => g.done).length
  const pct = goals.length ? Math.round((doneCount / goals.length) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* AI nudge */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Goal Nudge
          </h2>
          <button
            onClick={generateNudge}
            disabled={nudgeLoading || goals.filter((g) => !g.done).length === 0}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {nudgeLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Nudge me
          </button>
        </div>
        <p
          className={`leading-relaxed ${
            nudge
              ? 'font-serif text-lg text-foreground text-pretty'
              : 'text-sm text-muted-foreground'
          }`}
        >
          {nudge ||
            (nudgeLoading
              ? 'Looking at your goals…'
              : 'Get an AI nudge about your most at-risk goal.')}
        </p>
      </div>

      {/* Add goal */}
      <SectionCard title="Add Goal">
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
            >
              {GOAL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground outline-none focus:border-foreground/40"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes (optional)"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <button
              onClick={addGoal}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Goals list */}
      <SectionCard>
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>
              {doneCount} of {goals.length} complete
            </span>
            <span>{pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {['All', ...GOAL_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition ${
                filter === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goals here yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((g) => {
              const cc = CAT_COLORS[g.cat] || CAT_COLORS.Life
              return (
                <li
                  key={g.id}
                  className="group flex items-start gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <button
                    onClick={() => toggle(g)}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      g.done ? 'border-primary bg-primary' : 'border-border'
                    }`}
                    aria-label="Toggle goal complete"
                  >
                    {g.done && (
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-medium ${
                          g.done
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        }`}
                      >
                        {g.title}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase"
                        style={{ backgroundColor: cc.bg, color: cc.text }}
                      >
                        {g.cat}
                      </span>
                      {g.deadline && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          due {g.deadline}
                        </span>
                      )}
                    </div>
                    {g.note && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {g.note}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(g.id)}
                    aria-label="Delete goal"
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
