'use client'

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

      {/* Macro targets */}
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

      {/* Food guide */}
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
                  <li key={item.name} className="text-[14.5px] leading-snug text-ink">
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

      {/* Grocery list (interactive + saved) */}
      <GroceryList />

      {/* Sample day of eating */}
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

      {/* Training schedule */}
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

      {/* Workout library (view + log sets) */}
      <WorkoutLibrary />

      {/* Weekly checklist */}
      <SectionCard title="Weekly Checklist">
        <ul className="space-y-1.5">
          {WEEKLY_CHECKLIST.map((c) => (
            <li key={c} className="flex items-center gap-2.5 text-[14.5px] text-ink">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
              {c}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Josie's note */}
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
    </div>
  )
}
