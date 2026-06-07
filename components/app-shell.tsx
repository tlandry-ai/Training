'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import {
  dateKey,
  getScheduleForDate,
  parseDateKey,
} from '@/lib/plan'
import TodayTab from '@/components/tabs/today-tab'
import CalendarTab from '@/components/tabs/calendar-tab'
import LogTab from '@/components/tabs/log-tab'
import HabitsTab from '@/components/tabs/habits-tab'
import SkillsTab from '@/components/tabs/skills-tab'
import GoalsTab from '@/components/tabs/goals-tab'
import TodoTab from '@/components/tabs/todo-tab'
import WeeklyTab from '@/components/tabs/weekly-tab'
import BoardTab from '@/components/tabs/board-tab'

const TABS = [
  'TODAY',
  'CALENDAR',
  'LOG',
  'HABITS',
  'SKILLS',
  'GOALS',
  'TO-DO',
  'WEEKLY',
  'BOARD',
] as const
type Tab = (typeof TABS)[number]

export default function AppShell() {
  const [tab, setTab] = useState<Tab>('TODAY')
  const [streak, setStreak] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [goalCount, setGoalCount] = useState(0)
  const [statsVersion, setStatsVersion] = useState(0)

  const refreshStats = () => setStatsVersion((v) => v + 1)

  useEffect(() => {
    const supabase = getSupabase()
    let active = true

    async function load() {
      const { data: checkins } = await supabase
        .from('checkins')
        .select('date_key, block_id, done')
      const { data: goals } = await supabase
        .from('goals')
        .select('id, done')

      if (!active) return

      const rows = (checkins || []) as {
        date_key: string
        block_id: string
        done: boolean
      }[]

      // Total non-rest sessions completed
      const sessions = rows.filter(
        (r) => r.done && r.block_id !== 'rest',
      ).length
      setSessionCount(sessions)

      // Goals open count
      const g = (goals || []) as { id: string; done: boolean }[]
      setGoalCount(g.filter((x) => !x.done).length)

      // Day streak: consecutive days (ending today) where all scheduled
      // non-rest blocks are checked off. Rest days count as kept.
      const doneByDate = new Map<string, Set<string>>()
      for (const r of rows) {
        if (!r.done) continue
        if (!doneByDate.has(r.date_key)) doneByDate.set(r.date_key, new Set())
        doneByDate.get(r.date_key)!.add(r.block_id)
      }

      let s = 0
      const cursor = new Date()
      for (let i = 0; i < 120; i++) {
        const d = new Date(cursor)
        d.setDate(cursor.getDate() - i)
        const key = dateKey(d)
        const schedule = getScheduleForDate(d)
        const isRest = schedule.length === 1 && schedule[0].type === 'Rest'
        if (isRest) {
          // Rest days don't break the streak but also don't add to it on
          // the first iteration unless something is logged. Skip counting,
          // continue the chain.
          if (i === 0) continue
          continue
        }
        const done = doneByDate.get(key)
        const allDone =
          done && schedule.every((b) => done.has(b.id))
        if (allDone) {
          s++
        } else {
          if (i === 0) {
            // today not complete yet — don't break, just don't count today
            continue
          }
          break
        }
      }
      setStreak(s)
    }

    load()
    return () => {
      active = false
    }
  }, [statsVersion])

  const today = useMemo(() => new Date(), [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="font-serif text-2xl leading-none text-foreground sm:text-3xl">
              Summer Training
            </h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {today.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <Stat label="Day Streak" value={streak} />
            <Stat label="Sessions" value={sessionCount} />
            <Stat label="Goals" value={goalCount} />
            <button
              onClick={async () => {
                await fetch('/api/login', { method: 'DELETE' })
                window.location.reload()
              }}
              className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="mx-auto max-w-5xl overflow-x-auto px-4 sm:px-6">
          <div className="flex min-w-max gap-1 pb-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wide transition ${
                  tab === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {tab === 'TODAY' && <TodayTab onChange={refreshStats} />}
        {tab === 'CALENDAR' && <CalendarTab />}
        {tab === 'LOG' && <LogTab />}
        {tab === 'HABITS' && <HabitsTab />}
        {tab === 'SKILLS' && <SkillsTab />}
        {tab === 'GOALS' && <GoalsTab onChange={refreshStats} />}
        {tab === 'TO-DO' && <TodoTab />}
        {tab === 'WEEKLY' && <WeeklyTab />}
        {tab === 'BOARD' && <BoardTab />}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="font-serif text-xl leading-none text-foreground">
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  )
}
