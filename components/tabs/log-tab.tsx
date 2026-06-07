'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey } from '@/lib/plan'
import { SectionCard } from '@/components/ui-kit'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

interface Meal {
  id: string
  meal_type: string
  description: string
  ai_protein: number | null
  ai_carbs: number | null
  ai_fats: number | null
  ai_note: string | null
}

interface Workout {
  id: string
  type: string
  duration: string | null
  notes: string | null
}

export default function LogTab() {
  const key = dateKey(new Date())
  const supabase = getSupabase()

  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])

  const [mealType, setMealType] = useState('Breakfast')
  const [mealDesc, setMealDesc] = useState('')
  const [savingMeal, setSavingMeal] = useState(false)

  const [woType, setWoType] = useState('')
  const [woDuration, setWoDuration] = useState('')
  const [woNotes, setWoNotes] = useState('')
  const [savingWo, setSavingWo] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase
        .from('food_log')
        .select('*')
        .eq('date_key', key)
        .order('created_at', { ascending: true })
      setMeals((m || []) as any)

      const { data: w } = await supabase
        .from('workout_log')
        .select('*')
        .eq('date_key', key)
        .order('created_at', { ascending: true })
      setWorkouts((w || []) as any)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  async function addMeal() {
    const desc = mealDesc.trim()
    if (!desc) return
    setSavingMeal(true)
    const { data } = await supabase
      .from('food_log')
      .insert({ date_key: key, meal_type: mealType, description: desc })
      .select('*')
      .single()
    if (data) {
      const meal = data as any as Meal
      setMeals((prev) => [...prev, meal])
      setMealDesc('')
      // AI macro analysis
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'meal-analysis',
            payload: { mealType, description: desc },
          }),
        })
        const macros = await res.json()
        if (res.ok) {
          await supabase
            .from('food_log')
            .update({
              ai_protein: macros.protein,
              ai_carbs: macros.carbs,
              ai_fats: macros.fats,
              ai_note: macros.note,
            })
            .eq('id', meal.id)
          setMeals((prev) =>
            prev.map((x) =>
              x.id === meal.id
                ? {
                    ...x,
                    ai_protein: macros.protein,
                    ai_carbs: macros.carbs,
                    ai_fats: macros.fats,
                    ai_note: macros.note,
                  }
                : x,
            ),
          )
        }
      } catch {
        /* ignore analysis failure */
      }
    }
    setSavingMeal(false)
  }

  async function deleteMeal(id: string) {
    setMeals((p) => p.filter((m) => m.id !== id))
    await supabase.from('food_log').delete().eq('id', id)
  }

  async function addWorkout() {
    const t = woType.trim()
    if (!t) return
    setSavingWo(true)
    const { data } = await supabase
      .from('workout_log')
      .insert({
        date_key: key,
        type: t,
        duration: woDuration.trim() || null,
        notes: woNotes.trim() || null,
      })
      .select('*')
      .single()
    if (data) setWorkouts((p) => [...p, data as any])
    setWoType('')
    setWoDuration('')
    setWoNotes('')
    setSavingWo(false)
  }

  async function deleteWorkout(id: string) {
    setWorkouts((p) => p.filter((w) => w.id !== id))
    await supabase.from('workout_log').delete().eq('id', id)
  }

  const totals = meals.reduce(
    (acc, m) => ({
      protein: acc.protein + (m.ai_protein || 0),
      carbs: acc.carbs + (m.ai_carbs || 0),
      fats: acc.fats + (m.ai_fats || 0),
    }),
    { protein: 0, carbs: 0, fats: 0 },
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Food log */}
      <SectionCard title="Food Log">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          >
            {MEAL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            value={mealDesc}
            onChange={(e) => setMealDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMeal()}
            placeholder="e.g. Greek yogurt, granola, berries, honey"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <button
            onClick={addMeal}
            disabled={savingMeal}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {savingMeal && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
        </div>

        {meals.length > 0 && (
          <div className="mb-3 flex gap-4 rounded-xl bg-accent/50 px-4 py-2 font-mono text-[11px] text-muted-foreground">
            <span>Today: </span>
            <span className="text-foreground">{totals.protein}g P</span>
            <span className="text-foreground">{totals.carbs}g C</span>
            <span className="text-foreground">{totals.fats}g F</span>
          </div>
        )}

        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meals logged today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {meals.map((m) => (
              <li
                key={m.id}
                className="group rounded-xl border border-border px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {m.meal_type}
                    </span>
                    <p className="text-sm text-foreground">{m.description}</p>
                  </div>
                  <button
                    onClick={() => deleteMeal(m.id)}
                    aria-label="Delete meal"
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {m.ai_protein != null ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px]">
                    <span style={{ color: '#2d5a28' }}>{m.ai_protein}g P</span>
                    <span style={{ color: '#1a4a7a' }}>{m.ai_carbs}g C</span>
                    <span style={{ color: '#7a3d1a' }}>{m.ai_fats}g F</span>
                    {m.ai_note && (
                      <span className="text-muted-foreground">· {m.ai_note}</span>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Analyzing macros…
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Workout log */}
      <SectionCard title="Workout Log">
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={woType}
              onChange={(e) => setWoType(e.target.value)}
              placeholder="Type (e.g. Extra conditioning)"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <input
              value={woDuration}
              onChange={(e) => setWoDuration(e.target.value)}
              placeholder="Duration (e.g. 45 min)"
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40 sm:w-40"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={woNotes}
              onChange={(e) => setWoNotes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWorkout()}
              placeholder="Notes"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <button
              onClick={addWorkout}
              disabled={savingWo}
              className="rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        {workouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No extra workouts logged today.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {workouts.map((w) => (
              <li
                key={w.id}
                className="group flex items-start justify-between gap-2 rounded-xl border border-border px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{w.type}</span>
                    {w.duration && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {w.duration}
                      </span>
                    )}
                  </div>
                  {w.notes && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {w.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteWorkout(w.id)}
                  aria-label="Delete workout"
                  className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
