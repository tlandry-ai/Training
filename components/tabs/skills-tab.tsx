'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey, MONTH_NAMES, SKILL_EVENTS } from '@/lib/plan'

interface Note {
  id: string
  skill_name: string
  date_key: string
  entry: string
  created_at: string
}

const EVENT_COLORS: Record<string, { bg: string; text: string }> = {
  Bars: { bg: '#D4E4F5', text: '#1a4a7a' },
  Beam: { bg: '#EBD4F5', text: '#4a1a7a' },
  Floor: { bg: '#F5E6D4', text: '#7a3d1a' },
  Vault: { bg: '#F5D4D4', text: '#7a1a1a' },
  Conditioning: { bg: '#D6E8D4', text: '#2d5a28' },
  Other: { bg: '#D4F5F0', text: '#1a6a5a' },
}

function prettyDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${d}, ${y}`
}

export default function SkillsTab() {
  const supabase = getSupabase()
  const [notes, setNotes] = useState<Record<string, Note[]>>({})
  const [expanded, setExpanded] = useState<string | null>(SKILL_EVENTS[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('practice_entries')
        .select('id, skill_name, date_key, entry, created_at')
        .order('created_at', { ascending: false })
      const grouped: Record<string, Note[]> = {}
      for (const ev of SKILL_EVENTS) grouped[ev] = []
      for (const row of (data || []) as Note[]) {
        const ev = row.skill_name && grouped[row.skill_name] ? row.skill_name : 'Other'
        grouped[ev].push(row)
      }
      setNotes(grouped)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function countFor(ev: string) {
    return notes[ev]?.length || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-sm leading-relaxed text-muted-foreground">
        A blank page for each event. Just write — reps, cues, breakthroughs, frustrations. No structure required.
      </p>

      {SKILL_EVENTS.map((ev) => {
        const isOpen = expanded === ev
        const list = notes[ev] || []
        const color = EVENT_COLORS[ev] || EVENT_COLORS.Other
        return (
          <div
            key={ev}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : ev)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition ${isOpen ? 'rotate-180' : ''}`}
              />
              <span className="font-serif text-xl text-foreground">{ev}</span>
              <span
                className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {countFor(ev)} {countFor(ev) === 1 ? 'note' : 'notes'}
              </span>
            </button>

            {isOpen && (
              <EventJournal
                event={ev}
                notes={list}
                setNotes={setNotes}
                accent={color.text}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventJournal({
  event,
  notes,
  setNotes,
  accent,
}: {
  event: string
  notes: Note[]
  setNotes: React.Dispatch<React.SetStateAction<Record<string, Note[]>>>
  accent: string
}) {
  const supabase = getSupabase()
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function save() {
    const text = draft.trim()
    if (!text) return
    setSaving(true)
    const key = dateKey(new Date())
    const { data } = await supabase
      .from('practice_entries')
      .insert({ skill_name: event, date_key: key, entry: text })
      .select('id, skill_name, date_key, entry, created_at')
      .single()
    if (data) {
      setNotes((p) => ({ ...p, [event]: [data as Note, ...(p[event] || [])] }))
      setDraft('')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    setNotes((p) => ({ ...p, [event]: (p[event] || []).filter((n) => n.id !== id) }))
    await supabase.from('practice_entries').delete().eq('id', id)
  }

  function startEdit(n: Note) {
    setEditingId(n.id)
    setEditText(n.entry)
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text) return
    setNotes((p) => ({
      ...p,
      [event]: (p[event] || []).map((n) => (n.id === id ? { ...n, entry: text } : n)),
    }))
    setEditingId(null)
    await supabase.from('practice_entries').update({ entry: text }).eq('id', id)
  }

  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Write freely about ${event.toLowerCase()}…`}
          rows={4}
          className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-foreground/40"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-mono text-xs uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Save Note
              </>
            )}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Nothing written yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-xl bg-accent/40 px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className="font-mono text-[10px] uppercase tracking-widest"
                  style={{ color: accent }}
                >
                  {prettyDate(n.date_key)}
                </span>
                <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                  {editingId === n.id ? (
                    <button
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel edit"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(n)}
                      aria-label="Edit note"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    aria-label="Delete note"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {editingId === n.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-foreground/40"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => saveEdit(n.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-primary-foreground transition hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {n.entry}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
