'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import {
  dateKey,
  getScheduleForDate,
  getMonthGrid,
  DAY_NAMES,
  MONTH_NAMES,
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

const TYPE_OPTIONS: BlockType[] = [
  'CorePower',
  'SolidCore',
  'Lift',
  'Practice',
  'Work',
  'Run',
  'PT',
  'Rest',
]

// Nice default titles (matching the planned schedule) keyed by block id
const DEFAULT_TITLES: Record<string, string> = {
  corepower: '5:30 CorePower',
  lift: '7–8 Lift',
  practice: '8–10 Practice',
  work: '9–6 Work',
  run: '6:30p Run',
  solidcore: '5:30 Solid Core',
  pt: '6:30 PT',
}

export interface CalEvent {
  id: string // db id, or a temp id for unsaved drafts
  title: string
  type: BlockType
}

// Convert the procedural schedule into editable default drafts
function defaultEventsForDate(d: Date): CalEvent[] {
  const blocks = getScheduleForDate(d)
  if (blocks.length === 1 && blocks[0].type === 'Rest') return []
  return blocks.map((b) => {
    let title = DEFAULT_TITLES[b.id]
    // Tue/Thu practice runs 7–9 instead of 8–10
    if (b.id === 'practice' && (d.getDay() === 2 || d.getDay() === 4)) {
      title = '7–9 Practice'
    }
    return {
      id: `default-${b.id}`,
      title: title || b.label,
      type: b.type,
    }
  })
}

let tempCounter = 0
const tempId = () => `temp-${Date.now()}-${tempCounter++}`

export default function CalendarTab() {
  const [customByDate, setCustomByDate] = useState<Map<string, CalEvent[]>>(
    new Map(),
  )
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const todayKey = dateKey(new Date())

  async function loadEvents() {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('calendar_events')
      .select('id, date_key, title, type, sort_order')
      .order('sort_order', { ascending: true })
    const map = new Map<string, CalEvent[]>()
    ;(data || []).forEach((r: any) => {
      if (!map.has(r.date_key)) map.set(r.date_key, [])
      map.get(r.date_key)!.push({
        id: r.id,
        title: r.title,
        type: r.type as BlockType,
      })
    })
    setCustomByDate(map)
  }

  useEffect(() => {
    loadEvents()
  }, [])

  // Events to display for a day: custom override if present, else defaults
  function eventsForKey(d: Date): CalEvent[] {
    const key = dateKey(d)
    if (customByDate.has(key)) return customByDate.get(key)!
    return defaultEventsForDate(d)
  }

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
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          Tap any day to edit
        </span>
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
                const dow = d.getDay()
                const isWeekend = dow === 0 || dow === 6
                const isToday = key === todayKey
                const events = eventsForKey(d)

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditingKey(key)}
                    className={`flex min-h-[78px] flex-col gap-1 rounded-lg p-1.5 text-left transition hover:ring-2 hover:ring-foreground/30 ${
                      isWeekend ? 'bg-accent/40' : 'bg-secondary/40'
                    } ${
                      isToday
                        ? 'ring-2 ring-foreground'
                        : 'border border-border/60'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] ${
                        isWeekend ? 'text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {events.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {events.map((b) => (
                          <span
                            key={b.id}
                            className="truncate rounded px-1 py-0.5 font-mono text-[8px] font-medium leading-tight"
                            style={{
                              backgroundColor: BLOCK_COLORS[b.type].bg,
                              color: BLOCK_COLORS[b.type].text,
                            }}
                          >
                            {b.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {editingKey && (
        <DayEditor
          dateKeyStr={editingKey}
          initialEvents={
            customByDate.has(editingKey)
              ? customByDate.get(editingKey)!
              : defaultEventsForKey(editingKey)
          }
          onClose={() => setEditingKey(null)}
          onSaved={async () => {
            setEditingKey(null)
            await loadEvents()
          }}
        />
      )}
    </div>
  )
}

function defaultEventsForKey(key: string): CalEvent[] {
  const [y, m, day] = key.split('-').map(Number)
  return defaultEventsForDate(new Date(y, m - 1, day))
}

function DayEditor({
  dateKeyStr,
  initialEvents,
  onClose,
  onSaved,
}: {
  dateKeyStr: string
  initialEvents: CalEvent[]
  onClose: () => void
  onSaved: () => void
}) {
  const [events, setEvents] = useState<CalEvent[]>(() =>
    initialEvents.map((e) => ({ ...e, id: tempId() })),
  )
  const [saving, setSaving] = useState(false)

  const heading = useMemo(() => {
    const [y, m, day] = dateKeyStr.split('-').map(Number)
    const d = new Date(y, m - 1, day)
    return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[m - 1]} ${day}`
  }, [dateKeyStr])

  function update(id: string, patch: Partial<CalEvent>) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  function remove(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }
  function add() {
    setEvents((prev) => [...prev, { id: tempId(), title: '', type: 'Work' }])
  }

  async function save() {
    setSaving(true)
    const supabase = getSupabase()
    // Replace all events for this day
    await supabase.from('calendar_events').delete().eq('date_key', dateKeyStr)
    const rows = events
      .filter((e) => e.title.trim().length > 0)
      .map((e, idx) => ({
        date_key: dateKeyStr,
        title: e.title.trim(),
        type: e.type,
        sort_order: idx,
      }))
    if (rows.length > 0) {
      await supabase.from('calendar_events').insert(rows)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-serif text-xl text-foreground">{heading}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 font-mono text-lg text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
          {events.length === 0 && (
            <p className="py-6 text-center font-mono text-xs text-muted-foreground">
              No events yet. Add one below.
            </p>
          )}
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2"
            >
              <span
                className="h-8 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: BLOCK_COLORS[e.type].bg }}
              />
              <input
                value={e.title}
                onChange={(ev) => update(e.id, { title: ev.target.value })}
                placeholder="Event title"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/30"
              />
              <select
                value={e.type}
                onChange={(ev) =>
                  update(e.id, { type: ev.target.value as BlockType })
                }
                className="shrink-0 rounded-lg border border-border bg-background px-1.5 py-1.5 font-mono text-[11px] text-foreground outline-none focus:ring-2 focus:ring-foreground/30"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {BLOCK_COLORS[t].name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(e.id)}
                className="shrink-0 rounded-lg px-2 py-1 font-mono text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Delete event"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={add}
            className="mt-1 rounded-xl border border-dashed border-border py-2 font-mono text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          >
            + Add event
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-foreground px-5 py-2 font-mono text-xs font-medium text-background disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
