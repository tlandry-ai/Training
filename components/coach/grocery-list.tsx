'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Plus, Trash2, RotateCcw } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { GROCERY_SEED, GROCERY_CATEGORIES } from '@/lib/coach'
import { SectionCard } from '@/components/ui-kit'

interface GroceryItem {
  id: string
  name: string
  category: string
  checked: boolean
  is_custom: boolean
  sort_order: number
}

export default function GroceryList() {
  const supabase = getSupabase()
  const [items, setItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState<string>(GROCERY_CATEGORIES[0])
  const seeded = useRef(false)

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('grocery_items')
        .select('id, name, category, checked, is_custom, sort_order')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!active) return

      // First run: seed the table from Josie's default list.
      if ((!data || data.length === 0) && !seeded.current) {
        seeded.current = true
        const rows = GROCERY_SEED.map((s, i) => ({
          name: s.name,
          category: s.category,
          checked: false,
          is_custom: false,
          sort_order: i,
        }))
        const { data: inserted } = await supabase
          .from('grocery_items')
          .insert(rows)
          .select('id, name, category, checked, is_custom, sort_order')
        if (!active) return
        setItems((inserted || []) as unknown as GroceryItem[])
      } else {
        setItems((data || []) as unknown as GroceryItem[])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggle(item: GroceryItem) {
    const next = !item.checked
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: next } : i)),
    )
    await supabase
      .from('grocery_items')
      .update({ checked: next })
      .eq('id', item.id)
  }

  async function remove(item: GroceryItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    await supabase.from('grocery_items').delete().eq('id', item.id)
  }

  async function addItem() {
    const name = newName.trim()
    if (!name) return
    const sort_order = items.length
    setNewName('')
    const { data } = await supabase
      .from('grocery_items')
      .insert({ name, category: newCat, checked: false, is_custom: true, sort_order })
      .select('id, name, category, checked, is_custom, sort_order')
      .single()
    if (data) setItems((prev) => [...prev, data as unknown as GroceryItem])
  }

  async function uncheckAll() {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id)
    if (checkedIds.length === 0) return
    setItems((prev) => prev.map((i) => ({ ...i, checked: false })))
    await supabase
      .from('grocery_items')
      .update({ checked: false })
      .in('id', checkedIds)
  }

  const grouped = useMemo(() => {
    const cats = Array.from(
      new Set([...GROCERY_CATEGORIES, ...items.map((i) => i.category)]),
    )
    return cats
      .map((cat) => ({
        cat,
        rows: items.filter((i) => i.category === cat),
      }))
      .filter((g) => g.rows.length > 0)
  }, [items])

  const remaining = items.filter((i) => !i.checked).length

  return (
    <SectionCard
      title="Grocery List"
      action={
        <button
          onClick={uncheckAll}
          className="flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft transition active:text-ink"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      }
    >
      {loading ? (
        <p className="flex items-center gap-2 py-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : (
        <>
          <p className="mb-3 font-serif text-[13px] italic text-ink-soft">
            {remaining === 0
              ? 'All set — everything is checked off.'
              : `${remaining} item${remaining === 1 ? '' : 's'} left to grab.`}
          </p>

          {grouped.map((group) => (
            <div key={group.cat} className="mb-4 last:mb-2">
              <div className="mb-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                {group.cat}
              </div>
              {group.rows.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <button
                    onClick={() => toggle(item)}
                    aria-label={item.checked ? 'Uncheck' : 'Check'}
                    aria-pressed={item.checked}
                    className={`sched-box ${item.checked ? 'is-done' : ''}`}
                  />
                  <span
                    className={`flex-1 text-[15px] leading-snug ${
                      item.checked
                        ? 'text-ink-soft line-through'
                        : 'text-ink'
                    }`}
                  >
                    {item.name}
                    {item.is_custom && (
                      <span className="ml-2 font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                        added
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => remove(item)}
                    aria-label={`Remove ${item.name}`}
                    className="flex h-8 w-8 items-center justify-center text-ink-soft transition active:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ))}

          {/* Add your own */}
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) addItem()
                }}
                placeholder="Add an item…"
                className="field flex-1"
              />
              <button
                onClick={addItem}
                aria-label="Add item"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green text-paper"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GROCERY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewCat(cat)}
                  className={`cap-chip ${newCat === cat ? 'on' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </SectionCard>
  )
}
