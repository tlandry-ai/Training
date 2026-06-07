'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { ProgressBar, SectionCard } from '@/components/ui-kit'

interface Todo {
  id: string
  title: string
  category: string
  done: boolean
  priority: string
  due: string | null
}

const CATEGORIES = [
  'Gymnastics',
  'Fitness',
  'School',
  'Home',
  'Errands',
  'General',
] as const

const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Gymnastics: { bg: '#EBD4F5', text: '#4a1a7a', dot: '#7a3db8' },
  Fitness: { bg: '#D4E4F5', text: '#1a4a7a', dot: '#2f6fb0' },
  School: { bg: '#F5E6D4', text: '#7a3d1a', dot: '#b06a2f' },
  Home: { bg: '#D4F5F0', text: '#1a6a5a', dot: '#2f9a85' },
  Errands: { bg: '#F5D9D4', text: '#7a2a1a', dot: '#b04a3a' },
  General: { bg: '#E8E6DF', text: '#4a463d', dot: '#8a857a' },
}

export default function TodoTab() {
  const supabase = getSupabase()
  const [todos, setTodos] = useState<Todo[]>([])
  const [filter, setFilter] = useState<string>('All')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('General')
  const [priority, setPriority] = useState<string>('normal')
  const [due, setDue] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: true })
      setTodos((data || []) as any)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addTodo() {
    const t = title.trim()
    if (!t) return
    const { data } = await supabase
      .from('todos')
      .insert({
        title: t,
        category,
        priority,
        due: due || null,
        done: false,
      })
      .select('*')
      .single()
    if (data) setTodos((p) => [...p, data as any])
    setTitle('')
    setDue('')
    setPriority('normal')
  }

  async function toggle(todo: Todo) {
    const next = !todo.done
    setTodos((p) => p.map((x) => (x.id === todo.id ? { ...x, done: next } : x)))
    await supabase.from('todos').update({ done: next }).eq('id', todo.id)
  }

  async function remove(id: string) {
    setTodos((p) => p.filter((x) => x.id !== id))
    await supabase.from('todos').delete().eq('id', id)
  }

  async function clearCompleted() {
    const ids = todos.filter((t) => t.done).map((t) => t.id)
    if (ids.length === 0) return
    setTodos((p) => p.filter((t) => !t.done))
    await supabase.from('todos').delete().in('id', ids)
  }

  const counts = useMemo(() => {
    const c: Record<string, { total: number; done: number }> = {}
    for (const cat of CATEGORIES) c[cat] = { total: 0, done: 0 }
    for (const t of todos) {
      if (!c[t.category]) c[t.category] = { total: 0, done: 0 }
      c[t.category].total++
      if (t.done) c[t.category].done++
    }
    return c
  }, [todos])

  const filtered =
    filter === 'All' ? todos : todos.filter((t) => t.category === filter)

  // Sort: incomplete first, high priority first, then by creation order
  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const pr = (p: string) => (p === 'high' ? 0 : p === 'normal' ? 1 : 2)
    return pr(a.priority) - pr(b.priority)
  })

  const doneCount = todos.filter((t) => t.done).length
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Add todo */}
      <SectionCard title="Add Task">
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTodo()
            }}
            placeholder="What needs to get done?"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground/40"
            >
              <option value="high">High priority</option>
              <option value="normal">Normal</option>
              <option value="low">Low priority</option>
            </select>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground outline-none focus:border-foreground/40"
            />
            <button
              onClick={addTodo}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Category overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES.map((c) => {
          const cc = CAT_COLORS[c]
          const stat = counts[c]
          const open = stat.total - stat.done
          return (
            <button
              key={c}
              onClick={() => setFilter(filter === c ? 'All' : c)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                filter === c
                  ? 'border-foreground/40 bg-card shadow-sm'
                  : 'border-border bg-card hover:border-foreground/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: cc.dot }}
                />
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground">
                  {c}
                </span>
              </div>
              <span className="font-serif text-lg leading-none text-foreground">
                {open}
              </span>
            </button>
          )
        })}
      </div>

      {/* List */}
      <SectionCard>
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>
              {doneCount} of {todos.length} done
            </span>
            <span>{pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide transition ${
                filter === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
          {doneCount > 0 && (
            <button
              onClick={clearCompleted}
              className="ml-auto font-mono text-[11px] uppercase tracking-wide text-muted-foreground transition hover:text-destructive"
            >
              Clear done
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Add your first task above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((t) => {
              const cc = CAT_COLORS[t.category] || CAT_COLORS.General
              return (
                <li
                  key={t.id}
                  className="group flex items-start gap-3 rounded-xl border border-border px-4 py-3"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: cc.dot,
                  }}
                >
                  <button
                    onClick={() => toggle(t)}
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      t.done ? 'border-primary bg-primary' : 'border-border'
                    }`}
                    aria-label="Toggle task complete"
                  >
                    {t.done && (
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-medium ${
                          t.done
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        }`}
                      >
                        {t.title}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase"
                        style={{ backgroundColor: cc.bg, color: cc.text }}
                      >
                        {t.category}
                      </span>
                      {t.priority === 'high' && !t.done && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[9px] font-medium uppercase text-destructive">
                          High
                        </span>
                      )}
                      {t.due && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          due {t.due}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label="Delete task"
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
