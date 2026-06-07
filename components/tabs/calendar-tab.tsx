'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import {
  dateKey,
  getScheduleForDate,
  getMonthGrid,
  DAY_NAMES,
  BLOCK_COLORS,
  type BlockType,
} from '@/lib/plan'

const MONTHS = [
  { year: 2026, month: 5, label: 'June 2026' },
  { year: 2026, month: 6, label: 'July 2026' },
]

const LEGEND: BlockType[] = [
  'CorePower',
  'SolidCore',
  'Lift',
  'Practice',
  'Work',
  'Run',
  'PT',
]

export default function CalendarTab() {
  const [doneByDate, setDoneByDate] = useState<Map<string, Set<string>>>(
    new Map(),
  )
  const todayKey = dateKey(new Date())

  useEffect(() => {
    async function load() {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('checkins')
        .select('date_key, block_id, done')
      const map = new Map<string, Set<string>>()
      ;(data || []).forEach((r: any) => {
        if (!r.done) return
        if (!map.has(r.date_key)) map.set(r.date_key, new Set())
        map.get(r.date_key)!.add(r.block_id)
      })
      setDoneByDate(map)
    }
    load()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Legend
        </span>
        {LEGEND.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-medium"
            style={{ backgroundColor: BLOCK_COLORS[t].bg, color: BLOCK_COLORS[t].text }}
          >
            {BLOCK_COLORS[t].name}
          </span>
        ))}
      </div>

      {MONTHS.map((m) => {
        const cells = getMonthGrid(m.year, m.month)
        return (
          <div
            key={m.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <h2 className="mb-4 font-serif text-2xl text-foreground">
              {m.label}
            </h2>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_NAMES.map((d) => (
                <div
                  key={d}
                  className="pb-1 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {cells.map((d, i) => {
                if (!d) return <div key={`e${i}`} />
                const key = dateKey(d)
                const schedule = getScheduleForDate(d)
                const isRest =
                  schedule.length === 1 && schedule[0].type === 'Rest'
                const dow = d.getDay()
                const isWeekend = dow === 0 || dow === 6
                const isToday = key === todayKey
                const done = doneByDate.get(key) || new Set()

                return (
                  <div
                    key={key}
                    className={`flex min-h-[78px] flex-col gap-1 rounded-lg p-1.5 ${
                      isWeekend ? 'bg-accent/40' : 'bg-secondary/40'
                    } ${
                      isToday
                        ? 'ring-2 ring-foreground'
                        : 'border border-border/60'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] ${
                        isWeekend
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {!isRest && (
                      <div className="flex flex-col gap-1">
                        {schedule.map((b) => (
                          <span
                            key={b.id}
                            className="truncate rounded px-1 py-0.5 font-mono text-[8px] font-medium leading-tight"
                            style={{
                              backgroundColor: BLOCK_COLORS[b.type].bg,
                              color: BLOCK_COLORS[b.type].text,
                              opacity: done.has(b.id) ? 1 : 0.4,
                            }}
                          >
                            {BLOCK_COLORS[b.type].name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
