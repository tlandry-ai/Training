'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey, HABITS, RATING_LABELS, DAY_NAMES } from '@/lib/plan'
import { ProgressBar, SectionCard } from '@/components/ui-kit'

interface HabitRow {
  habit: string
  done: boolean
  rating: number | null
}

export default function HabitsTab() {
  const key = dateKey(new Date())
  const supabase = getSupabase()

  const [rows, setRows] = useState<Record<string, HabitRow>>({})
  const [weekData, setWeekData] = useState<Map<string, Set<string>>>(new Map())

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('habit_log')
        .select('habit, done, rating')
        .eq('date_key', key)
      const map: Record<string, HabitRow> = {}
      ;(data || []).forEach((r: any) => {
        map[r.habit] = r
      })
      setRows(map)

      const keys = weekDates.map(dateKey)
      const { data: week } = await supabase
        .from('habit_log')
        .select('date_key, habit, done')
        .in('date_key', keys)
      const wmap = new Map<string, Set<string>>()
      ;(week || []).forEach((r: any) => {
        if (!r.done) return
        if (!wmap.has(r.date_key)) wmap.set(r.date_key, new Set())
        wmap.get(r.date_key)!.add(r.habit)
      })
      setWeekData(wmap)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  async function toggle(habit: string) {
    const current = rows[habit]
    const nowDone = !current?.done
    const next = {
      ...rows,
      [habit]: {
        habit,
        done: nowDone,
        rating: nowDone ? current?.rating ?? null : null,
      },
    }
    setRows(next)
    await supabase
      .from('habit_log')
      .upsert(
        { date_key: key, habit, done: nowDone, rating: next[habit].rating },
        { onConflict: 'date_key,habit' },
      )
    // update week view
    setWeekData((prev) => {
      const m = new Map(prev)
      const set = new Set(m.get(key) || [])
      if (nowDone) set.add(habit)
      else set.delete(habit)
      m.set(key, set)
      return m
    })
  }

  async function rate(habit: string, rating: number) {
    const next = {
      ...rows,
      [habit]: { habit, done: true, rating },
    }
    setRows(next)
    await supabase
      .from('habit_log')
      .upsert(
        { date_key: key, habit, done: true, rating },
        { onConflict: 'date_key,habit' },
      )
  }

  const doneCount = HABITS.filter((h) => rows[h.key]?.done).length
  const pct = Math.round((doneCount / HABITS.length) * 100)

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Daily Habits">
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>
              {doneCount} of {HABITS.length} done today
            </span>
            <span>{pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>

        <ul className="flex flex-col gap-3">
          {HABITS.map((h) => {
            const row = rows[h.key]
            const isDone = row?.done
            return (
              <li
                key={h.key}
                className={`rounded-xl border px-4 py-3 transition ${
                  isDone ? 'border-transparent bg-accent/60' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggle(h.key)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isDone
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}
                    aria-label={`Toggle ${h.label}`}
                  >
                    {isDone && (
                      <Check className="h-4 w-4 text-primary-foreground" />
                    )}
                  </button>
                  <span className="text-lg" aria-hidden="true">
                    {h.emoji}
                  </span>
                  <span className="flex-1 font-medium text-foreground">
                    {h.label}
                  </span>
                </div>

                {isDone && (
                  <div className="mt-3 flex items-center gap-2 pl-10">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => rate(h.key, n)}
                        className={`h-8 w-8 rounded-lg font-mono text-xs transition ${
                          row?.rating === n
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-muted-foreground hover:bg-accent border border-border'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                      {row?.rating ? RATING_LABELS[row.rating] : 'Rate it'}
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </SectionCard>

      {/* Week view */}
      <SectionCard title="This Week">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left" />
                {weekDates.map((d) => (
                  <th
                    key={dateKey(d)}
                    className="pb-1 text-center font-mono text-[10px] uppercase text-muted-foreground"
                  >
                    {DAY_NAMES[d.getDay()]}
                    <div className="text-foreground">{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HABITS.map((h) => (
                <tr key={h.key}>
                  <td className="pr-2 text-sm text-foreground">
                    <span className="mr-1" aria-hidden="true">
                      {h.emoji}
                    </span>
                    {h.label}
                  </td>
                  {weekDates.map((d) => {
                    const done = weekData.get(dateKey(d))?.has(h.key)
                    return (
                      <td key={dateKey(d)} className="text-center">
                        <div
                          className={`mx-auto h-6 w-6 rounded-md ${
                            done ? 'bg-primary' : 'bg-accent'
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
