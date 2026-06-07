'use client'

import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { SectionCard, ProgressBar } from '@/components/ui-kit'

interface Objective {
  id: string
  title: string
  period: string
}

interface KeyResult {
  id: string
  objective_id: string
  title: string
  start_value: number
  current_value: number
  target_value: number
  unit: string | null
  confidence: number
}

interface Weekly {
  id?: string
  objective_id: string
  week_key: string
  p1: string | null
  p2: string | null
  p3: string | null
  p4: string | null
  win: string | null
}

// Monday-based ISO-ish week key, e.g. "2026-W26"
function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  )
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function krProgress(kr: KeyResult): number {
  const span = kr.target_value - kr.start_value
  if (span === 0) return kr.current_value >= kr.target_value ? 100 : 0
  return Math.round(((kr.current_value - kr.start_value) / span) * 100)
}

function confidenceColor(c: number): string {
  if (c >= 7) return '#2d5a28'
  if (c >= 4) return '#7a6a1a'
  return '#7a1a1a'
}

export default function OkrTab() {
  const supabase = getSupabase()
  const wk = weekKey()

  const [objectives, setObjectives] = useState<Objective[]>([])
  const [krs, setKrs] = useState<KeyResult[]>([])
  const [weeklies, setWeeklies] = useState<Record<string, Weekly>>({})
  const [loading, setLoading] = useState(true)

  const [newObj, setNewObj] = useState('')
  const [addingObj, setAddingObj] = useState(false)
  const [openObj, setOpenObj] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: objs } = await supabase
        .from('objectives')
        .select('*')
        .order('created_at', { ascending: true })
      const objList = (objs || []) as Objective[]
      setObjectives(objList)
      if (objList.length && !openObj) setOpenObj(objList[0].id)

      const { data: k } = await supabase
        .from('key_results')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      setKrs((k || []) as KeyResult[])

      const { data: w } = await supabase
        .from('okr_weekly')
        .select('*')
        .eq('week_key', wk)
      const map: Record<string, Weekly> = {}
      for (const row of (w || []) as Weekly[]) map[row.objective_id] = row
      setWeeklies(map)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addObjective() {
    const title = newObj.trim()
    if (!title) return
    setAddingObj(true)
    const { data } = await supabase
      .from('objectives')
      .insert({ title })
      .select('*')
      .single()
    if (data) {
      setObjectives((p) => [...p, data as Objective])
      setOpenObj((data as Objective).id)
      setNewObj('')
    }
    setAddingObj(false)
  }

  async function deleteObjective(id: string) {
    setObjectives((p) => p.filter((o) => o.id !== id))
    setKrs((p) => p.filter((k) => k.objective_id !== id))
    await supabase.from('objectives').delete().eq('id', id)
  }

  async function addKr(objectiveId: string) {
    const { data } = await supabase
      .from('key_results')
      .insert({
        objective_id: objectiveId,
        title: 'New key result',
        start_value: 0,
        current_value: 0,
        target_value: 100,
        unit: '',
        confidence: 5,
      })
      .select('*')
      .single()
    if (data) setKrs((p) => [...p, data as KeyResult])
  }

  function patchKrLocal(id: string, patch: Partial<KeyResult>) {
    setKrs((p) => p.map((k) => (k.id === id ? { ...k, ...patch } : k)))
  }

  async function saveKr(id: string, patch: Partial<KeyResult>) {
    await supabase.from('key_results').update(patch).eq('id', id)
  }

  async function deleteKr(id: string) {
    setKrs((p) => p.filter((k) => k.id !== id))
    await supabase.from('key_results').delete().eq('id', id)
  }

  function patchWeeklyLocal(objectiveId: string, patch: Partial<Weekly>) {
    setWeeklies((p) => ({
      ...p,
      [objectiveId]: {
        objective_id: objectiveId,
        week_key: wk,
        p1: null,
        p2: null,
        p3: null,
        p4: null,
        win: null,
        ...p[objectiveId],
        ...patch,
      },
    }))
  }

  async function saveWeekly(objectiveId: string) {
    const row = weeklies[objectiveId]
    if (!row) return
    const { data } = await supabase
      .from('okr_weekly')
      .upsert(
        {
          objective_id: objectiveId,
          week_key: wk,
          p1: row.p1,
          p2: row.p2,
          p3: row.p3,
          p4: row.p4,
          win: row.win,
        },
        { onConflict: 'objective_id,week_key' },
      )
      .select('*')
      .single()
    if (data)
      setWeeklies((p) => ({ ...p, [objectiveId]: data as Weekly }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="OKRs · Radical Focus">
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          Set one inspiring <span className="text-foreground">Objective</span>{' '}
          (qualitative, motivating) and 2–3 measurable{' '}
          <span className="text-foreground">Key Results</span>. Each Monday,
          commit to the priorities that move the needle; each Friday, capture a
          win. Aim for ~70% on Key Results — if you hit 100%, you set them too
          low.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newObj}
            onChange={(e) => setNewObj(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addObjective()}
            placeholder="New objective — e.g. Compete confidently at States"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <button
            onClick={addObjective}
            disabled={addingObj}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {addingObj ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Objective
          </button>
        </div>
      </SectionCard>

      {objectives.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <Target className="h-6 w-6" />
          <p className="text-sm">No objectives yet. Add your first one above.</p>
        </div>
      )}

      {objectives.map((obj) => {
        const objKrs = krs.filter((k) => k.objective_id === obj.id)
        const avg =
          objKrs.length > 0
            ? Math.round(
                objKrs.reduce((s, k) => s + krProgress(k), 0) / objKrs.length,
              )
            : 0
        const isOpen = openObj === obj.id
        const weekly = weeklies[obj.id]
        return (
          <section
            key={obj.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 p-5">
              <button
                onClick={() => setOpenObj(isOpen ? null : obj.id)}
                className="flex flex-1 items-start gap-3 text-left"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground">
                  <Target className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {obj.period}
                  </span>
                  <h3 className="font-serif text-lg leading-tight text-foreground text-balance">
                    {obj.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={avg} className="max-w-48" />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {avg}%
                    </span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteObjective(obj.id)}
                  aria-label="Delete objective"
                  className="text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOpenObj(isOpen ? null : obj.id)}
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                  className="text-muted-foreground"
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-border px-5 pb-5 pt-4">
                {/* Key Results */}
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Key Results
                  </h4>
                  <button
                    onClick={() => addKr(obj.id)}
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>

                {objKrs.length === 0 ? (
                  <p className="mb-4 text-sm text-muted-foreground">
                    No key results yet.
                  </p>
                ) : (
                  <ul className="mb-5 flex flex-col gap-3">
                    {objKrs.map((kr) => {
                      const prog = krProgress(kr)
                      return (
                        <li
                          key={kr.id}
                          className="rounded-xl border border-border p-3"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              value={kr.title}
                              onChange={(e) =>
                                patchKrLocal(kr.id, { title: e.target.value })
                              }
                              onBlur={(e) =>
                                saveKr(kr.id, { title: e.target.value })
                              }
                              className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
                            />
                            <button
                              onClick={() => deleteKr(kr.id)}
                              aria-label="Delete key result"
                              className="text-muted-foreground transition hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <ProgressBar value={prog} />
                            <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                              {prog}%
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <label className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                              Start
                              <input
                                type="number"
                                value={kr.start_value}
                                onChange={(e) =>
                                  patchKrLocal(kr.id, {
                                    start_value: Number(e.target.value),
                                  })
                                }
                                onBlur={(e) =>
                                  saveKr(kr.id, {
                                    start_value: Number(e.target.value),
                                  })
                                }
                                className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-foreground/40"
                              />
                            </label>
                            <label className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                              Now
                              <input
                                type="number"
                                value={kr.current_value}
                                onChange={(e) =>
                                  patchKrLocal(kr.id, {
                                    current_value: Number(e.target.value),
                                  })
                                }
                                onBlur={(e) =>
                                  saveKr(kr.id, {
                                    current_value: Number(e.target.value),
                                  })
                                }
                                className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-foreground/40"
                              />
                            </label>
                            <label className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                              Target
                              <input
                                type="number"
                                value={kr.target_value}
                                onChange={(e) =>
                                  patchKrLocal(kr.id, {
                                    target_value: Number(e.target.value),
                                  })
                                }
                                onBlur={(e) =>
                                  saveKr(kr.id, {
                                    target_value: Number(e.target.value),
                                  })
                                }
                                className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-foreground/40"
                              />
                            </label>
                            <input
                              value={kr.unit ?? ''}
                              onChange={(e) =>
                                patchKrLocal(kr.id, { unit: e.target.value })
                              }
                              onBlur={(e) =>
                                saveKr(kr.id, { unit: e.target.value })
                              }
                              placeholder="unit"
                              className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-foreground/40"
                            />
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                              Confidence
                            </span>
                            <input
                              type="range"
                              min={1}
                              max={10}
                              value={kr.confidence}
                              onChange={(e) =>
                                patchKrLocal(kr.id, {
                                  confidence: Number(e.target.value),
                                })
                              }
                              onMouseUp={(e) =>
                                saveKr(kr.id, {
                                  confidence: Number(
                                    (e.target as HTMLInputElement).value,
                                  ),
                                })
                              }
                              onTouchEnd={(e) =>
                                saveKr(kr.id, {
                                  confidence: Number(
                                    (e.target as HTMLInputElement).value,
                                  ),
                                })
                              }
                              className="flex-1 accent-primary"
                            />
                            <span
                              className="w-10 text-right font-mono text-xs font-medium"
                              style={{ color: confidenceColor(kr.confidence) }}
                            >
                              {kr.confidence}/10
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Weekly cadence */}
                <div className="rounded-xl bg-accent/40 p-4">
                  <h4 className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    This Week · {wk}
                  </h4>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Monday commit · Friday celebrate
                  </p>
                  <div className="flex flex-col gap-2">
                    {(['p1', 'p2', 'p3', 'p4'] as const).map((p, i) => (
                      <div key={p} className="flex items-center gap-2">
                        <span className="w-5 shrink-0 font-mono text-[11px] text-muted-foreground">
                          P{i + 1}
                        </span>
                        <input
                          value={weekly?.[p] ?? ''}
                          onChange={(e) =>
                            patchWeeklyLocal(obj.id, { [p]: e.target.value })
                          }
                          onBlur={() => saveWeekly(obj.id)}
                          placeholder={
                            i === 0
                              ? 'Top priority this week'
                              : `Priority ${i + 1}`
                          }
                          className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40"
                        />
                      </div>
                    ))}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center">🎉</span>
                      <input
                        value={weekly?.win ?? ''}
                        onChange={(e) =>
                          patchWeeklyLocal(obj.id, { win: e.target.value })
                        }
                        onBlur={() => saveWeekly(obj.id)}
                        placeholder="Win to celebrate this week"
                        className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:border-foreground/40"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
