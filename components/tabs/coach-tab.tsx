'use client'

import { useState } from 'react'
import {
  Target,
  Salad,
  ShoppingCart,
  UtensilsCrossed,
  CalendarDays,
  Dumbbell,
  ListChecks,
  MessageCircle,
  Heart,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'
import { Panel, SectionCard, Eyebrow } from '@/components/ui-kit'
import {
  COACH,
  MACRO_TARGETS,
  DAILY_PRIORITIES,
  FOOD_GUIDE,
  SAMPLE_DAY,
  TRAINING_SCHEDULE,
  WEEKLY_CHECKLIST,
  COACH_NOTE,
} from '@/lib/coach'
import GroceryList from '@/components/coach/grocery-list'
import WorkoutLibrary from '@/components/coach/workout-library'
import AskJosie from '@/components/coach/ask-josie'

type ViewKey =
  | 'hub'
  | 'josie'
  | 'macros'
  | 'food'
  | 'grocery'
  | 'sample'
  | 'training'
  | 'workouts'
  | 'checklist'
  | 'note'

interface HubItem {
  key: ViewKey
  label: string
  hint: string
  icon: LucideIcon
  accent?: string
  wide?: boolean
}

const HUB_ITEMS: HubItem[] = [
  {
    key: 'josie',
    label: 'Ask Coach Josie',
    hint: 'Recipes, swaps & questions',
    icon: MessageCircle,
    wide: true,
  },
  { key: 'macros', label: 'Macros', hint: 'Daily targets', icon: Target },
  { key: 'food', label: 'Food Guide', hint: 'Approved foods', icon: Salad },
  {
    key: 'grocery',
    label: 'Grocery List',
    hint: 'Shop & check off',
    icon: ShoppingCart,
  },
  {
    key: 'sample',
    label: 'Sample Day',
    hint: 'A day of eating',
    icon: UtensilsCrossed,
  },
  {
    key: 'training',
    label: 'Schedule',
    hint: 'Weekly split',
    icon: CalendarDays,
  },
  {
    key: 'workouts',
    label: 'Workouts',
    hint: 'Lifts & logging',
    icon: Dumbbell,
  },
  {
    key: 'checklist',
    label: 'Checklist',
    hint: 'Weekly goals',
    icon: ListChecks,
  },
  { key: 'note', label: "Josie's Note", hint: 'A word from your coach', icon: Heart },
]

const VIEW_TITLES: Record<Exclude<ViewKey, 'hub'>, string> = {
  josie: 'Ask Coach Josie',
  macros: 'Daily Nutrition Targets',
  food: 'Food Guide',
  grocery: 'Grocery List',
  sample: 'Sample Day of Eating',
  training: 'Training Schedule',
  workouts: 'Workout Library',
  checklist: 'Weekly Checklist',
  note: `A Note From ${COACH.name.split(' ')[0]}`,
}

function MacroStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-secondary px-2 py-3 text-center">
      <span
        className="font-serif text-[22px] font-semibold leading-none"
        style={{ color: accent }}
      >
        {value}
      </span>
      <span className="mt-1.5 font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
    </div>
  )
}

export default function CoachTab() {
  const [view, setView] = useState<ViewKey>('hub')

  if (view === 'hub') {
    return (
      <div>
        {/* Coach byline */}
        <Panel dark>
          <Eyebrow muted>Your Plan · {COACH.date}</Eyebrow>
          <h2 className="font-serif text-[26px] font-semibold leading-tight text-oat">
            {COACH.title}
          </h2>
          <p className="mt-1 font-sans text-[12px] uppercase tracking-[0.14em] text-oat/60">
            Coached by {COACH.name}
          </p>
        </Panel>

        {/* Icon hub */}
        <div className="grid grid-cols-2 gap-2.5">
          {HUB_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`flex flex-col items-start rounded-lg border border-border bg-paper p-4 text-left transition-colors active:bg-secondary ${
                  item.wide ? 'col-span-2' : ''
                }`}
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-oat">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-serif text-[16px] font-semibold leading-tight text-ink">
                  {item.label}
                </span>
                <span className="mt-0.5 font-sans text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                  {item.hint}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Section header with back button */}
      <div className="mb-3.5 flex items-center gap-3">
        <button
          onClick={() => setView('hub')}
          aria-label="Back to coach menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-ink-soft active:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-serif text-[22px] font-semibold leading-none text-ink">
          {VIEW_TITLES[view]}
        </h2>
      </div>

      {view === 'josie' && <AskJosie />}

      {view === 'macros' && (
        <SectionCard title="Daily Nutrition Targets">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-serif text-[30px] font-semibold leading-none text-ink">
              {MACRO_TARGETS.caloriesLow.toLocaleString()}–
              {MACRO_TARGETS.caloriesHigh.toLocaleString()}
            </span>
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              calories
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MacroStat
              label="Protein"
              value={`${MACRO_TARGETS.protein}g`}
              accent="var(--green-ink)"
            />
            <MacroStat
              label="Carbs"
              value={`${MACRO_TARGETS.carbs}g`}
              accent="var(--blue-ink)"
            />
            <MacroStat
              label="Fat"
              value={`${MACRO_TARGETS.fat}g`}
              accent="var(--rose-ink)"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {DAILY_PRIORITIES.map((p) => (
              <span
                key={p}
                className="font-serif text-[13px] italic text-ink-soft"
              >
                · {p}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {view === 'food' && (
        <SectionCard title="Food Guide">
          <div className="space-y-4">
            {FOOD_GUIDE.map((group) => (
              <div key={group.key}>
                <div
                  className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: group.accent }}
                >
                  {group.label}
                </div>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li
                      key={item.name}
                      className="text-[14.5px] leading-snug text-ink"
                    >
                      {item.name}
                      {item.note && (
                        <span className="ml-1.5 font-serif text-[12.5px] italic text-ink-soft">
                          ({item.note})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {view === 'grocery' && <GroceryList />}

      {view === 'sample' && (
        <SectionCard title="Sample Day of Eating">
          {SAMPLE_DAY.map((m) => (
            <div
              key={m.meal}
              className="border-b border-border py-2.5 last:border-b-0"
            >
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                {m.meal}
              </div>
              <div className="mt-1 text-[14.5px] leading-normal text-ink">
                {m.text}
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {view === 'training' && (
        <SectionCard title="Training Schedule">
          {TRAINING_SCHEDULE.map((d) => (
            <div
              key={d.day}
              className="flex items-baseline justify-between border-b border-border py-2.5 last:border-b-0"
            >
              <span className="font-serif text-[15px] font-semibold text-ink">
                {d.day}
              </span>
              <span className="text-[13.5px] text-ink-soft">{d.focus}</span>
            </div>
          ))}
        </SectionCard>
      )}

      {view === 'workouts' && <WorkoutLibrary />}

      {view === 'checklist' && (
        <SectionCard title="Weekly Checklist">
          <ul className="space-y-1.5">
            {WEEKLY_CHECKLIST.map((c) => (
              <li
                key={c}
                className="flex items-center gap-2.5 text-[14.5px] text-ink"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
                {c}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {view === 'note' && (
        <Panel dark>
          <Eyebrow muted>A Note From {COACH.name.split(' ')[0]}</Eyebrow>
          <div className="space-y-3">
            {COACH_NOTE.split('\n\n').map((para, i) => (
              <p
                key={i}
                className="font-serif text-[14.5px] leading-relaxed text-oat/85"
              >
                {para}
              </p>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
