'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey } from '@/lib/plan'
import { Panel } from '@/components/ui-kit'

interface Meal {
  id: string
  meal_type: string | null
  description: string | null
  fuel_read: string | null
  ai_note: string | null
  ai_protein: number | null
  ai_carbs: number | null
  ai_fats: number | null
}

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

function relativeLabel(d: Date): string {
  const today = new Date()
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`
}

export default function FoodDaySwiper() {
  const supabase = getSupabase()
  const [day, setDay] = useState(new Date())
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [slide, setSlide] = useState<'none' | 'left' | 'right'>('none')

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isToday = isSameDay(day, new Date())

  useEffect(() => {
    let active = true
    setLoading(true)
    async function load() {
      const { data } = await supabase
        .from('food_log')
        .select(
          'id, meal_type, description, fuel_read, ai_note, ai_protein, ai_carbs, ai_fats',
        )
        .eq('date_key', dateKey(day))
        .order('created_at', { ascending: true })
      if (!active) return
      setMeals((data || []) as Meal[])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  function go(direction: -1 | 1) {
    // Don't allow navigating into the future.
    if (direction === 1 && isToday) return
    setSlide(direction === 1 ? 'left' : 'right')
    setDay((d) => addDays(d, direction))
    // reset the transient slide class after the animation frame
    window.setTimeout(() => setSlide('none'), 220)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // ignore mostly-vertical gestures (scrolling)
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) go(1) // swipe left -> next (newer) day
    else go(-1) // swipe right -> previous (older) day
  }

  const totals = meals.reduce(
    (acc, m) => ({
      protein: acc.protein + (m.ai_protein || 0),
      carbs: acc.carbs + (m.ai_carbs || 0),
      fats: acc.fats + (m.ai_fats || 0),
    }),
    { protein: 0, carbs: 0, fats: 0 },
  )
  const cals = totals.protein * 4 + totals.carbs * 4 + totals.fats * 9
  const mealCals = (m: Meal) =>
    (m.ai_protein || 0) * 4 + (m.ai_carbs || 0) * 4 + (m.ai_fats || 0) * 9

  return (
    <Panel>
      {/* Day navigator */}
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          aria-label="Previous day"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-ink-soft active:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">
            Fuel
          </div>
          <div className="font-serif text-[17px] font-semibold text-ink">
            {relativeLabel(day)}
          </div>
        </div>
        <button
          onClick={() => go(1)}
          aria-label="Next day"
          disabled={isToday}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-ink-soft active:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Swipe surface */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={
          slide === 'left'
            ? 'food-slide-left'
            : slide === 'right'
              ? 'food-slide-right'
              : ''
        }
      >
        {loading ? (
          <p className="flex items-center gap-2 py-3 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : meals.length === 0 ? (
          <p className="py-3 text-sm text-ink-soft">
            No meals logged {isToday ? 'today' : 'this day'}. Swipe to another
            day, or capture a meal on the Today tab.
          </p>
        ) : (
          <>
            {/* Daily total */}
            <div className="mb-3 flex items-baseline justify-between rounded-xl bg-secondary px-4 py-3">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                Day total
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-2xl leading-none text-ink">
                  {cals.toLocaleString()}
                </span>
                <span className="font-sans text-[11px] text-ink-soft">cal</span>
              </div>
            </div>
            <div className="mb-3 flex gap-4 px-1 font-sans text-[11px] font-semibold">
              <span style={{ color: 'var(--green-ink)' }}>
                {totals.protein}g protein
              </span>
              <span style={{ color: 'var(--blue-ink)' }}>
                {totals.carbs}g carbs
              </span>
              <span style={{ color: 'var(--rose-ink)' }}>{totals.fats}g fat</span>
            </div>

            {/* Meals */}
            {meals.map((m) => (
              <div
                key={m.id}
                className="border-b border-border py-3 last:border-b-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    {m.meal_type || 'Meal'}
                  </span>
                  {m.ai_protein != null && (
                    <span className="shrink-0 font-sans text-[11px] font-medium text-ink">
                      {mealCals(m)} cal
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[14.5px] leading-normal text-ink">
                  {m.fuel_read || m.ai_note || m.description}
                </div>
                {m.ai_protein != null && (
                  <div className="mt-1.5 flex gap-3 font-sans text-[11px]">
                    <span style={{ color: 'var(--green-ink)' }}>
                      {m.ai_protein}g P
                    </span>
                    <span style={{ color: 'var(--blue-ink)' }}>
                      {m.ai_carbs}g C
                    </span>
                    <span style={{ color: 'var(--rose-ink)' }}>
                      {m.ai_fats}g F
                    </span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Panel>
  )
}
