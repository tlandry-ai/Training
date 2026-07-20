'use client'

import { useState } from 'react'
import { MONTH_NAMES } from '@/lib/plan'
import TodayTab from '@/components/tabs/today-tab'
import LogTab from '@/components/tabs/log-tab'
import GoalsTab from '@/components/tabs/goals-tab'
import CalendarTab from '@/components/tabs/calendar-tab'
import BoardTab from '@/components/tabs/board-tab'
import CoachTab from '@/components/tabs/coach-tab'

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'log', label: 'Log' },
  { key: 'coach', label: 'Coach' },
  { key: 'goals', label: 'Goals' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'board', label: 'Board' },
] as const
type Tab = (typeof TABS)[number]['key']

export default function AppShell() {
  const [tab, setTab] = useState<Tab>('today')

  const now = new Date()
  const dateLine = `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`

  return (
    <div className="min-h-screen bg-oat pb-24">
      {/* Masthead */}
      <header className="border-b border-border bg-oat px-5 pb-3.5 pt-6">
        <div className="mx-auto flex max-w-[560px] items-start justify-between">
          <div>
            <h1 className="font-serif text-[34px] font-semibold leading-none tracking-tight text-ink">
              Summer Training
            </h1>
            <p className="mt-2 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
              {dateLine}
            </p>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/login', { method: 'DELETE' })
              window.location.reload()
            }}
            className="mt-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft transition hover:text-ink"
          >
            Exit
          </button>
        </div>
      </header>
      <div className="rule-stripe" />

      {/* Views */}
      <main className="mx-auto max-w-[560px] px-4 pb-2 pt-[18px]">
        {tab === 'today' && <TodayTab />}
        {tab === 'log' && <LogTab />}
        {tab === 'coach' && <CoachTab />}
        {tab === 'goals' && <GoalsTab />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'board' && <BoardTab />}
      </main>

      {/* Bottom tab bar */}
      <nav
        role="tablist"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[560px] border-t border-border bg-paper px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2"
      >
        {TABS.map((t) => {
          const selected = tab === t.key
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setTab(t.key)
                window.scrollTo(0, 0)
              }}
              className={`flex flex-1 flex-col items-center px-1 py-[9px] font-sans text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                selected ? 'text-ink' : 'text-ink-soft'
              }`}
            >
              <span
                className={`mb-[7px] h-1 w-full rounded-sm ${selected ? 'tab-mark' : 'bg-transparent'}`}
              />
              {t.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
