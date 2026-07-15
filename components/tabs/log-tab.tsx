'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { Panel, Eyebrow } from '@/components/ui-kit'

// A unified history entry drawn from practice, food, and workout logs.
interface Entry {
  id: string
  dateKey: string // yyyy-mm-dd
  kind: string // display label, e.g. "Bars", "Lunch · Fuel"
  text: string
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function daysAgo(k: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const then = parseKey(k)
  return Math.round((today.getTime() - then.getTime()) / 86400000)
}

export default function LogTab() {
  const supabase = getSupabase()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [practice, food, workouts] = await Promise.all([
        supabase
          .from('practice_entries')
          .select('id, date_key, event, entry, went_well, needs_work')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('food_log')
          .select('id, date_key, meal_type, description, fuel_read, ai_note')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('workout_log')
          .select('id, date_key, type, duration, notes')
          .order('created_at', { ascending: false })
          .limit(60),
      ])

      const all: Entry[] = []

      for (const p of (practice.data || []) as any[]) {
        const text =
          p.entry ||
          [p.went_well && `Went well: ${p.went_well}`, p.needs_work && `Needs work: ${p.needs_work}`]
            .filter(Boolean)
            .join(' · ')
        if (!text) continue
        all.push({
          id: `p-${p.id}`,
          dateKey: p.date_key,
          kind: p.event || 'Practice',
          text,
        })
      }

      for (const m of (food.data || []) as any[]) {
        const text = m.fuel_read || m.ai_note || m.description
        if (!text) continue
        all.push({
          id: `f-${m.id}`,
          dateKey: m.date_key,
          kind: `${m.meal_type || 'Meal'} · Fuel`,
          text,
        })
      }

      for (const w of (workouts.data || []) as any[]) {
        const text = [w.duration, w.notes].filter(Boolean).join(' · ') || w.type
        all.push({
          id: `w-${w.id}`,
          dateKey: w.date_key,
          kind: w.type || 'Workout',
          text,
        })
      }

      all.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
      setEntries(all)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const thisWeek = entries.filter((e) => daysAgo(e.dateKey) < 7)
  const earlier = entries.filter((e) => daysAgo(e.dateKey) >= 7)

  function renderEntry(e: Entry) {
    const d = parseKey(e.dateKey)
    return (
      <div
        key={e.id}
        className="flex gap-3 border-b border-border py-[13px] last:border-b-0"
      >
        <div className="w-11 shrink-0 pt-px font-serif text-[13px] font-semibold leading-tight text-ink-soft">
          {DAY_ABBR[d.getDay()]}
          <br />
          {d.getDate()}
        </div>
        <div className="flex-1 text-[14.5px] leading-normal text-ink">
          <div className="mb-[3px] font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            {e.kind}
          </div>
          {e.text}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Panel>
        <p className="flex items-center gap-2 py-1.5 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your log…
        </p>
      </Panel>
    )
  }

  return (
    <div>
      <Panel>
        <Eyebrow>This week</Eyebrow>
        {thisWeek.length === 0 ? (
          <p className="py-1.5 text-sm text-ink-soft">
            Nothing logged yet this week. Capture a meal or talk through a
            session on the Today tab.
          </p>
        ) : (
          thisWeek.map(renderEntry)
        )}
      </Panel>

      <Panel>
        <Eyebrow>Earlier</Eyebrow>
        {earlier.length === 0 ? (
          <p className="log-empty">
            Older entries appear here as you log. Nothing beyond the last seven
            days yet.
          </p>
        ) : (
          earlier.map(renderEntry)
        )}
      </Panel>
    </div>
  )
}
