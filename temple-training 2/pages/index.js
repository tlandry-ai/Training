import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLORS = {
  bg: '#0d0d0d', surface: '#161616', border: '#222',
  red: '#E8322A', redDim: '#7a1a15', white: '#F5F0E8',
  muted: '#555', mutedLight: '#888',
  solid: { bg: '#1a3318', text: '#6fcf6a', border: '#2d5a28' },
  cp:    { bg: '#131e2e', text: '#6aaef5', border: '#1a4a7a' },
  lift:  { bg: '#2e1a0d', text: '#f5a96a', border: '#7a3d1a' },
  gym:   { bg: '#1e0d2e', text: '#c46af5', border: '#4a1a7a' },
  run:   { bg: '#2e0d0d', text: '#f56a6a', border: '#7a1a1a' },
  pt:    { bg: '#0d2e28', text: '#6af5e0', border: '#1a6a5a' },
  work:  { bg: '#1e1c0d', text: '#d4c96a', border: '#5a4a1a' },
}

const WORK_START = new Date(2026, 5, 22)
const WORK_END   = new Date(2026, 7, 1)

const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getDayPlan(date) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return { isActive: false, blocks: [] }
  const inRange = d >= WORK_START && d < WORK_END
  if (!inRange) return { isActive: false, blocks: [] }
  const mwf = dow === 1 || dow === 3 || dow === 5
  const blocks = []
  if (mwf) {
    blocks.push({ id: 'cp',   label: 'CorePower',   time: '5:30 AM',         color: COLORS.cp   })
    blocks.push({ id: 'lift', label: 'Lift',         time: '7:00–8:00 AM',    color: COLORS.lift })
    blocks.push({ id: 'gym',  label: 'Gym Practice', time: '8:00–10:00 AM',   color: COLORS.gym  })
    blocks.push({ id: 'work', label: 'Work',         time: '9:00 AM–6:00 PM', color: COLORS.work })
    if (dow === 3 || dow === 5)
      blocks.push({ id: 'run', label: 'Run',         time: '6:30 PM',         color: COLORS.run  })
  } else {
    blocks.push({ id: 'solid', label: 'Solid Core',  time: '5:30 AM',         color: COLORS.solid })
    blocks.push({ id: 'pt',   label: 'PT',           time: '6:30–7:00 AM',    color: COLORS.pt   })
    blocks.push({ id: 'gym',  label: 'Gym Practice', time: '7:00–9:00 AM',    color: COLORS.gym  })
    blocks.push({ id: 'work', label: 'Work',         time: '9:00 AM–6:00 PM', color: COLORS.work })
  }
  return { isActive: true, blocks }
}

function dateKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function buildMonthCells(year, month) {
  const cells = []
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

export default function Home() {
  const [tab, setTab] = useState('today')
  const [today] = useState(new Date())
  const [checkins, setCheckins] = useState({})
  const [notes, setNotes] = useState({})
  const [noteInput, setNoteInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: ci }, { data: no }] = await Promise.all([
      supabase.from('checkins').select('*'),
      supabase.from('notes').select('*').order('created_at', { ascending: true }),
    ])
    const ciMap = {}
    ;(ci || []).forEach(row => {
      if (!ciMap[row.date_key]) ciMap[row.date_key] = {}
      ciMap[row.date_key][row.block_id] = row.done
    })
    const noMap = {}
    ;(no || []).forEach(row => {
      if (!noMap[row.date_key]) noMap[row.date_key] = []
      noMap[row.date_key].push({ text: row.text, ts: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
    })
    setCheckins(ciMap)
    setNotes(noMap)
    setLoading(false)
  }

  async function toggleCheckin(date, blockId) {
    const key = dateKey(date)
    const current = checkins[key]?.[blockId] || false
    const updated = { ...checkins, [key]: { ...(checkins[key] || {}), [blockId]: !current } }
    setCheckins(updated)
    await supabase.from('checkins').upsert(
      { date_key: key, block_id: blockId, done: !current },
      { onConflict: 'date_key,block_id' }
    )
  }

  async function saveNote() {
    if (!noteInput.trim()) return
    setSaving(true)
    const key = dateKey(today)
    const text = noteInput.trim()
    const { data } = await supabase.from('notes').insert({ date_key: key, text }).select().single()
    if (data) {
      const entry = { text, ts: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      setNotes(prev => ({ ...prev, [key]: [...(prev[key] || []), entry] }))
    }
    setNoteInput('')
    setSaving(false)
  }

  const todayKey = dateKey(today)
  const todayPlan = getDayPlan(today)
  const todayCheckins = checkins[todayKey] || {}
  const todayNotes = notes[todayKey] || []
  const todayDone = todayPlan.blocks.filter(b => todayCheckins[b.id]).length
  const todayTotal = todayPlan.blocks.length
  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  function calcStreak() {
    let streak = 0
    const d = new Date(today); d.setDate(d.getDate() - 1)
    for (let i = 0; i < 60; i++) {
      const plan = getDayPlan(d)
      if (!plan.isActive) { d.setDate(d.getDate() - 1); continue }
      const dc = checkins[dateKey(d)] || {}
      if (!plan.blocks.some(b => dc[b.id])) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  function getDayStatus(date) {
    const plan = getDayPlan(date)
    if (!plan.isActive) return 'inactive'
    const dc = checkins[dateKey(date)] || {}
    const done = plan.blocks.filter(b => dc[b.id]).length
    const d = new Date(date); d.setHours(0,0,0,0)
    const t = new Date(today); t.setHours(0,0,0,0)
    if (d > t) return 'future'
    if (done === 0) return 'missed'
    if (done === plan.blocks.length) return 'complete'
    return 'partial'
  }

  const streak = loading ? 0 : calcStreak()
  const totalSessions = Object.values(checkins).reduce((acc, dc) => acc + Object.values(dc).filter(Boolean).length, 0)

  const G = (color) => `<style>@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; } input:focus, textarea:focus { outline: none; }</style>`

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.white, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; } input:focus, textarea:focus { outline: none; } .block-row { transition: background 0.12s; cursor: pointer; } .block-row:hover { background: #1e1e1e !important; }`}</style>

      {/* HEADER */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.9rem', letterSpacing: '0.12em', color: COLORS.red, lineHeight: 1 }}>ARENA TRAINING</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: COLORS.muted, letterSpacing: '0.08em', marginTop: '3px' }}>
            {DAY_NAMES[today.getDay()].toUpperCase()}, {MONTH_NAMES[today.getMonth()].toUpperCase()} {today.getDate()} · TEMPLE LANDRY
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: COLORS.red, lineHeight: 1 }}>{streak}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.52rem', color: COLORS.muted, letterSpacing: '0.05em' }}>DAY STREAK</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', color: COLORS.white, lineHeight: 1 }}>{totalSessions}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.52rem', color: COLORS.muted, letterSpacing: '0.05em' }}>SESSIONS</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
        {[
          { id: 'today', label: 'TODAY' },
          { id: 'calendar', label: 'CALENDAR' },
          { id: 'skills', label: 'SKILLS ↗', locked: true },
        ].map(t => (
          <button key={t.id} onClick={() => !t.locked && setTab(t.id)} style={{
            background: 'none', border: 'none', cursor: t.locked ? 'default' : 'pointer',
            padding: '12px 22px',
            fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', letterSpacing: '0.1em',
            color: tab === t.id ? COLORS.red : t.locked ? COLORS.muted : COLORS.mutedLight,
            borderBottom: tab === t.id ? `2px solid ${COLORS.red}` : '2px solid transparent',
            opacity: t.locked ? 0.35 : 1,
          }}>{t.label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', color: COLORS.muted, letterSpacing: '0.08em' }}>
          LOADING...
        </div>
      )}

      {!loading && tab === 'today' && (
        <div style={{ padding: '28px', maxWidth: '640px' }}>
          {!todayPlan.isActive ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '4rem', letterSpacing: '0.1em', color: COLORS.border }}>REST DAY</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', color: COLORS.muted, marginTop: '8px' }}>
                {today < WORK_START ? 'Training starts June 22' : 'Weekends off. Recover.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.1em', color: COLORS.mutedLight }}>TODAY'S PLAN</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', color: pct === 100 ? COLORS.red : COLORS.mutedLight }}>
                    {todayDone}/{todayTotal} {pct === 100 ? '· DONE ✓' : `· ${pct}%`}
                  </div>
                </div>
                <div style={{ height: '3px', background: COLORS.border, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: COLORS.red, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
                {todayPlan.blocks.map(block => {
                  const done = !!todayCheckins[block.id]
                  return (
                    <div key={block.id} className="block-row" onClick={() => toggleCheckin(today, block.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      background: done ? block.color.bg : COLORS.surface,
                      border: `1px solid ${done ? block.color.border : COLORS.border}`,
                      borderRadius: '8px', padding: '14px 18px',
                    }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${done ? block.color.text : COLORS.muted}`,
                        background: done ? block.color.text : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {done && <span style={{ color: block.color.bg, fontSize: '0.65rem', fontWeight: 800 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: done ? block.color.text : COLORS.white }}>{block.label}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: COLORS.muted, marginTop: '2px' }}>{block.time}</div>
                      </div>
                      {done && <div style={{ fontFamily: 'Bebas Neue', fontSize: '0.82rem', letterSpacing: '0.08em', color: block.color.text }}>DONE</div>}
                    </div>
                  )
                })}
              </div>

              <div>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.1em', color: COLORS.mutedLight, marginBottom: '14px' }}>
                  COACH NOTES / LOG
                </div>
                {todayNotes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {todayNotes.map((n, i) => (
                      <div key={i} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.85rem', color: COLORS.white, lineHeight: 1.55 }}>{n.text}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.58rem', color: COLORS.muted, marginTop: '5px' }}>{n.ts}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveNote()}
                    placeholder="Add a note, coach correction, assignment..."
                    style={{
                      flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px', padding: '12px 16px', color: COLORS.white,
                      fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  <button onClick={saveNote} disabled={saving} style={{
                    background: COLORS.red, border: 'none', borderRadius: '8px',
                    padding: '12px 20px', color: 'white', fontFamily: 'Bebas Neue',
                    fontSize: '0.9rem', letterSpacing: '0.08em', cursor: 'pointer',
                  }}>
                    {saving ? '...' : 'SAVE'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && tab === 'calendar' && (
        <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '28px' }}>
            {[
              { label: 'Complete', color: COLORS.red },
              { label: 'Partial', color: '#5a3a0a' },
              { label: 'Missed', color: '#3a0a0a' },
              { label: 'Future', color: COLORS.surface },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color, border: `1px solid ${l.color}` }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.62rem', color: COLORS.muted }}>{l.label}</span>
              </div>
            ))}
          </div>

          {[[2026,5],[2026,6]].map(([yr, mo]) => {
            const cells = buildMonthCells(yr, mo)
            return (
              <div key={mo} style={{ marginBottom: '36px' }}>
                <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.5rem', letterSpacing: '0.1em', color: COLORS.white, marginBottom: '10px' }}>
                  {MONTH_NAMES[mo].toUpperCase()} {yr}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                    <div key={d} style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.58rem', color: COLORS.muted, textAlign: 'center', padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>
                  ))}
                  {cells.map((date, i) => {
                    if (!date) return <div key={i} />
                    const status = getDayStatus(date)
                    const isToday = dateKey(date) === todayKey
                    const hasNote = (notes[dateKey(date)] || []).length > 0
                    const bgMap = { complete: COLORS.red, partial: '#3a2208', missed: '#2a0808', future: COLORS.surface, inactive: COLORS.bg }
                    return (
                      <div key={i} onClick={() => status !== 'inactive' && setTab('today')} style={{
                        background: bgMap[status] || COLORS.bg,
                        border: `1px solid ${isToday ? COLORS.red : '#222'}`,
                        borderRadius: '4px', padding: '6px', minHeight: '46px',
                        cursor: status !== 'inactive' ? 'pointer' : 'default',
                        position: 'relative',
                      }}>
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: '0.65rem',
                          color: status === 'complete' ? 'white' : status === 'inactive' ? '#2a2a2a' : COLORS.mutedLight,
                          fontWeight: isToday ? 700 : 400,
                        }}>{date.getDate()}</div>
                        {hasNote && <div style={{ position: 'absolute', bottom: '5px', right: '5px', width: '5px', height: '5px', borderRadius: '50%', background: status === 'complete' ? 'rgba(255,255,255,0.5)' : COLORS.red }} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
