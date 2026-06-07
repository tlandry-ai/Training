'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey, SKILL_EVENTS } from '@/lib/plan'
import { SectionCard } from '@/components/ui-kit'

interface Skill {
  id: string
  name: string
  event: string
}

interface Entry {
  id: string
  skill_id: string
  date_key: string
  entry: string
  ai_went_well: string | null
  ai_needs_work: string | null
  ai_coach_feedback: string | null
  ai_pattern: string | null
}

export default function SkillsTab() {
  const supabase = getSupabase()
  const [skills, setSkills] = useState<Skill[]>([])
  const [entries, setEntries] = useState<Record<string, Entry[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [event, setEvent] = useState('Bars')

  const [entryInput, setEntryInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('skills')
        .select('*')
        .order('created_at', { ascending: true })
      setSkills((data || []) as any)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addSkill() {
    const n = name.trim()
    if (!n) return
    const { data } = await supabase
      .from('skills')
      .insert({ name: n, event })
      .select('*')
      .single()
    if (data) setSkills((p) => [...p, data as any])
    setName('')
  }

  async function deleteSkill(id: string) {
    setSkills((p) => p.filter((s) => s.id !== id))
    await supabase.from('skills').delete().eq('id', id)
  }

  async function loadEntries(skillId: string) {
    if (entries[skillId]) return
    const { data } = await supabase
      .from('practice_entries')
      .select('*')
      .eq('skill_id', skillId)
      .order('created_at', { ascending: false })
    setEntries((p) => ({ ...p, [skillId]: (data || []) as any }))
  }

  function toggleExpand(skillId: string) {
    if (expanded === skillId) {
      setExpanded(null)
    } else {
      setExpanded(skillId)
      setEntryInput('')
      loadEntries(skillId)
    }
  }

  async function addEntry(skill: Skill) {
    const text = entryInput.trim()
    if (!text) return
    setAnalyzing(true)
    const key = dateKey(new Date())
    const { data } = await supabase
      .from('practice_entries')
      .insert({
        skill_id: skill.id,
        skill_name: skill.name,
        date_key: key,
        entry: text,
      })
      .select('*')
      .single()

    let created = data as any as Entry
    if (created) {
      setEntries((p) => ({
        ...p,
        [skill.id]: [created, ...(p[skill.id] || [])],
      }))
      setEntryInput('')

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'skill-analysis',
            payload: { skillName: skill.name, event: skill.event, entry: text },
          }),
        })
        const a = await res.json()
        if (res.ok) {
          await supabase
            .from('practice_entries')
            .update({
              ai_went_well: a.went_well,
              ai_needs_work: a.needs_work,
              ai_coach_feedback: a.coach_feedback,
              ai_pattern: a.pattern,
            })
            .eq('id', created.id)
          setEntries((p) => ({
            ...p,
            [skill.id]: (p[skill.id] || []).map((e) =>
              e.id === created.id
                ? {
                    ...e,
                    ai_went_well: a.went_well,
                    ai_needs_work: a.needs_work,
                    ai_coach_feedback: a.coach_feedback,
                    ai_pattern: a.pattern,
                  }
                : e,
            ),
          }))
        }
      } catch {
        /* ignore */
      }
    }
    setAnalyzing(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Add Skill">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            placeholder="Skill name (e.g. Double back dismount)"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          >
            {SKILL_EVENTS.map((ev) => (
              <option key={ev}>{ev}</option>
            ))}
          </select>
          <button
            onClick={addSkill}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </SectionCard>

      {skills.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          No skills yet. Add one above to start logging practice.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {skills.map((s) => {
            const isOpen = expanded === s.id
            const list = entries[s.id] || []
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="group flex items-center gap-3 px-5 py-4">
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                    <span className="font-serif text-lg text-foreground">
                      {s.name}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium"
                      style={{ backgroundColor: '#EBD4F5', color: '#4a1a7a' }}
                    >
                      {s.event}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteSkill(s.id)}
                    aria-label="Delete skill"
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border px-5 py-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                      <textarea
                        value={entryInput}
                        onChange={(e) => setEntryInput(e.target.value)}
                        placeholder="Describe today's reps — what felt good, what didn't…"
                        rows={2}
                        className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
                      />
                      <button
                        onClick={() => addEntry(s)}
                        disabled={analyzing}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-32"
                      >
                        {analyzing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Log + AI'
                        )}
                      </button>
                    </div>

                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No practice entries yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {list.map((e) => (
                          <li
                            key={e.id}
                            className="rounded-xl bg-accent/40 px-4 py-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                {e.date_key}
                              </span>
                            </div>
                            <p className="mb-3 text-sm italic text-foreground">
                              “{e.entry}”
                            </p>
                            {e.ai_coach_feedback ? (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <AiBit
                                  label="Went Well"
                                  text={e.ai_went_well}
                                  color="#2d5a28"
                                />
                                <AiBit
                                  label="Needs Work"
                                  text={e.ai_needs_work}
                                  color="#7a3d1a"
                                />
                                <AiBit
                                  label="Coach Feedback"
                                  text={e.ai_coach_feedback}
                                  color="#1a4a7a"
                                />
                                <AiBit
                                  label="Pattern"
                                  text={e.ai_pattern}
                                  color="#4a1a7a"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />{' '}
                                Coaching analysis…
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AiBit({
  label,
  text,
  color,
}: {
  label: string
  text: string | null
  color: string
}) {
  return (
    <div className="rounded-lg bg-card px-3 py-2">
      <div
        className="font-mono text-[9px] uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </div>
      <p className="mt-0.5 text-sm text-foreground">{text || '—'}</p>
    </div>
  )
}
