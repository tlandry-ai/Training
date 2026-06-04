import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg:'#F5F0E8', surface:'#ffffff', border:'#e8e3da', borderLight:'#f0ece3',
  text:'#1a1a1a', muted:'#aaa', mutedDark:'#555',
  solid:{ bg:'#D6E8D4', text:'#2d5a28', border:'#b8d4b5' },
  cp:   { bg:'#D4E4F5', text:'#1a4a7a', border:'#b5cce8' },
  lift: { bg:'#F5E6D4', text:'#7a3d1a', border:'#e8cdb5' },
  gym:  { bg:'#EBD4F5', text:'#4a1a7a', border:'#d4b5e8' },
  run:  { bg:'#F5D4D4', text:'#7a1a1a', border:'#e8b5b5' },
  pt:   { bg:'#D4F5F0', text:'#1a6a5a', border:'#b5e8e0' },
  work: { bg:'#F5F0D4', text:'#7a6a1a', border:'#e8ddb5' },
}

const MEAL_TYPES = [
  { id:'breakfast', label:'Breakfast', icon:'🌅' },
  { id:'lunch',     label:'Lunch',     icon:'☀️' },
  { id:'dinner',    label:'Dinner',    icon:'🌙' },
  { id:'snack',     label:'Snack',     icon:'🍎' },
]

const WORKOUT_TYPES = ['Gymnastics','Lift','Pilates','Run','CorePower','Solid Core','PT','Walk','Swim','Other']

const CATS = [
  { id:'gym',     label:'Gymnastics', color:'#4a1a7a' },
  { id:'fitness', label:'Fitness',    color:'#7a3d1a' },
  { id:'skills',  label:'Skills',     color:'#1a4a7a' },
  { id:'life',    label:'Life',       color:'#2d5a28' },
]

const WORK_START  = new Date(2026, 5, 22)
const WORK_END    = new Date(2026, 7, 1)
const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getDayPlan(date) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return { isActive:false, isWeekend:true,  blocks:[] }
  if (d < WORK_START || d >= WORK_END) return { isActive:false, isWeekend:false, blocks:[] }
  const blocks = []
  if (dow === 1 || dow === 3 || dow === 5) {
    blocks.push({ id:'cp',   label:'5:30 CorePower', color:C.cp   })
    blocks.push({ id:'lift', label:'7–8 Lift',        color:C.lift })
    blocks.push({ id:'gym',  label:'8–10 Practice',   color:C.gym  })
    blocks.push({ id:'work', label:'9–6 Work',        color:C.work })
    if (dow === 3 || dow === 5) blocks.push({ id:'run', label:'6:30p Run', color:C.run })
  } else {
    blocks.push({ id:'solid', label:'5:30 Solid Core', color:C.solid })
    blocks.push({ id:'pt',   label:'6:30 PT',          color:C.pt   })
    blocks.push({ id:'gym',  label:'7–9 Practice',     color:C.gym  })
    blocks.push({ id:'work', label:'9–6 Work',         color:C.work })
  }
  return { isActive:true, isWeekend:false, blocks }
}

function dateKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function buildMonthCells(year, month) {
  const cells = []
  const first = new Date(year, month, 1).getDay()
  const days  = new Date(year, month+1, 0).getDate()
  for (let i=0; i<first; i++) cells.push(null)
  for (let d=1; d<=days; d++) cells.push(new Date(year, month, d))
  return cells
}

export default function Home() {
  const [tab, setTab]               = useState('today')
  const [today]                     = useState(new Date())
  const [checkins, setCheckins]     = useState({})
  const [notes, setNotes]           = useState({})
  const [goals, setGoals]           = useState([])
  const [foodLog, setFoodLog]       = useState({})
  const [workoutLog, setWorkoutLog] = useState({})
  const [noteInput, setNoteInput]   = useState('')
  const [newGoal, setNewGoal]       = useState({ title:'', cat:'gym', deadline:'', note:'' })
  const [addingGoal, setAddingGoal] = useState(false)
  const [filterCat, setFilterCat]   = useState('all')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  // Food log form
  const [newFood, setNewFood]       = useState({ meal_type:'breakfast', description:'' })
  const [addingFood, setAddingFood] = useState(false)

  // Workout log form
  const [newWorkout, setNewWorkout] = useState({ type:'Gymnastics', duration:'', notes:'' })
  const [addingWorkout, setAddingWorkout] = useState(false)

  // Log tab date navigation
  const [logDate, setLogDate] = useState(new Date())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data:ci }, { data:no }, { data:go }, { data:fl }, { data:wl }] = await Promise.all([
      supabase.from('checkins').select('*'),
      supabase.from('notes').select('*').order('created_at', { ascending:true }),
      supabase.from('goals').select('*').order('created_at', { ascending:true }),
      supabase.from('food_log').select('*').order('created_at', { ascending:true }),
      supabase.from('workout_log').select('*').order('created_at', { ascending:true }),
    ])
    const ciMap = {}
    ;(ci||[]).forEach(r => { if (!ciMap[r.date_key]) ciMap[r.date_key]={}; ciMap[r.date_key][r.block_id]=r.done })
    const noMap = {}
    ;(no||[]).forEach(r => { if (!noMap[r.date_key]) noMap[r.date_key]=[]; noMap[r.date_key].push({ text:r.text, ts:new Date(r.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }) })
    const flMap = {}
    ;(fl||[]).forEach(r => { if (!flMap[r.date_key]) flMap[r.date_key]=[]; flMap[r.date_key].push(r) })
    const wlMap = {}
    ;(wl||[]).forEach(r => { if (!wlMap[r.date_key]) wlMap[r.date_key]=[]; wlMap[r.date_key].push(r) })
    setCheckins(ciMap); setNotes(noMap); setGoals(go||[]); setFoodLog(flMap); setWorkoutLog(wlMap)
    setLoading(false)
  }

  async function toggleCheckin(date, blockId) {
    const key = dateKey(date)
    const cur = checkins[key]?.[blockId] || false
    setCheckins(prev => ({ ...prev, [key]:{ ...(prev[key]||{}), [blockId]:!cur } }))
    await supabase.from('checkins').upsert({ date_key:key, block_id:blockId, done:!cur }, { onConflict:'date_key,block_id' })
  }

  async function saveNote() {
    if (!noteInput.trim()) return
    setSaving(true)
    const key = dateKey(today); const text = noteInput.trim()
    const { data } = await supabase.from('notes').insert({ date_key:key, text }).select().single()
    if (data) { const entry = { text, ts:new Date(data.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }; setNotes(prev => ({ ...prev, [key]:[...(prev[key]||[]), entry] })) }
    setNoteInput(''); setSaving(false)
  }

  async function toggleGoal(id) {
    const goal = goals.find(g => g.id===id); if (!goal) return
    setGoals(prev => prev.map(g => g.id===id ? {...g,done:!g.done} : g))
    await supabase.from('goals').update({ done:!goal.done }).eq('id', id)
  }

  async function saveGoal() {
    if (!newGoal.title.trim()) return
    const { data } = await supabase.from('goals').insert({ title:newGoal.title.trim(), cat:newGoal.cat, deadline:newGoal.deadline||null, note:newGoal.note||null, done:false }).select().single()
    if (data) setGoals(prev => [...prev, data])
    setNewGoal({ title:'', cat:'gym', deadline:'', note:'' }); setAddingGoal(false)
  }

  async function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id!==id))
    await supabase.from('goals').delete().eq('id', id)
  }

  async function saveFood() {
    if (!newFood.description.trim()) return
    const key = dateKey(logDate)
    const { data } = await supabase.from('food_log').insert({ date_key:key, meal_type:newFood.meal_type, description:newFood.description.trim() }).select().single()
    if (data) setFoodLog(prev => ({ ...prev, [key]:[...(prev[key]||[]), data] }))
    setNewFood({ meal_type:'breakfast', description:'' }); setAddingFood(false)
  }

  async function deleteFoodEntry(id) {
    const key = dateKey(logDate)
    setFoodLog(prev => ({ ...prev, [key]:(prev[key]||[]).filter(e => e.id!==id) }))
    await supabase.from('food_log').delete().eq('id', id)
  }

  async function saveWorkout() {
    if (!newWorkout.type) return
    const key = dateKey(logDate)
    const { data } = await supabase.from('workout_log').insert({ date_key:key, type:newWorkout.type, duration:newWorkout.duration||null, notes:newWorkout.notes||null }).select().single()
    if (data) setWorkoutLog(prev => ({ ...prev, [key]:[...(prev[key]||[]), data] }))
    setNewWorkout({ type:'Gymnastics', duration:'', notes:'' }); setAddingWorkout(false)
  }

  async function deleteWorkoutEntry(id) {
    const key = dateKey(logDate)
    setWorkoutLog(prev => ({ ...prev, [key]:(prev[key]||[]).filter(e => e.id!==id) }))
    await supabase.from('workout_log').delete().eq('id', id)
  }

  const todayKey      = dateKey(today)
  const todayPlan     = getDayPlan(today)
  const todayCI       = checkins[todayKey]  || {}
  const todayNotes    = notes[todayKey]     || []
  const logDateKey    = dateKey(logDate)
  const logFood       = foodLog[logDateKey]   || []
  const logWorkouts   = workoutLog[logDateKey]|| []
  const isLogToday    = logDateKey === todayKey
  const done          = todayPlan.blocks.filter(b => todayCI[b.id]).length
  const total         = todayPlan.blocks.length
  const pct           = total > 0 ? Math.round((done/total)*100) : 0
  const goalsComplete = goals.filter(g => g.done).length
  const filteredGoals = filterCat==='all' ? goals : goals.filter(g => g.cat===filterCat)

  function calcStreak() {
    let s=0; const d=new Date(today); d.setDate(d.getDate()-1)
    for (let i=0; i<60; i++) {
      const plan=getDayPlan(d); if (!plan.isActive) { d.setDate(d.getDate()-1); continue }
      const dc=checkins[dateKey(d)]||{}; if (!plan.blocks.some(b=>dc[b.id])) break
      s++; d.setDate(d.getDate()-1)
    }
    return s
  }

  const streak        = loading ? '—' : calcStreak()
  const totalSessions = Object.values(checkins).reduce((a,dc) => a+Object.values(dc).filter(Boolean).length, 0)

  const TABS = [
    { id:'today',    label:'TODAY'    },
    { id:'calendar', label:'CALENDAR' },
    { id:'log',      label:'LOG'      },
    { id:'goals',    label:'GOALS'    },
    { id:'skills',   label:'SKILLS ↗', locked:true },
  ]

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { background:#F5F0E8; }
    input:focus, textarea:focus, select:focus { outline:none; }
    .brow { transition:background 0.12s; cursor:pointer; }
    .brow:hover { background:#f8f4ec !important; }
    .goal-row:hover .del-btn { opacity:1 !important; }
    .log-row:hover .del-btn  { opacity:1 !important; }
    .tab-b:hover  { color:#1a1a1a !important; }
    .add-btn:hover { border-color:#1a1a1a !important; color:#1a1a1a !important; }
    .cal-day-cell:hover { border-color:#aaa !important; }
  `

  const inputStyle = { background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:'10px 14px', color:C.text, fontSize:'0.85rem', fontFamily:"'DM Sans', sans-serif" }
  const saveBtnStyle = { background:C.text, border:'none', borderRadius:6, padding:'10px 20px', color:C.bg, fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }
  const cancelBtnStyle = { background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, padding:'10px 20px', color:C.muted, fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }

  return (
    <div style={{ background:C.bg, minHeight:'100vh', color:C.text, fontFamily:"'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'20px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontFamily:"'DM Serif Display', serif", fontSize:'1.9rem', letterSpacing:'-0.5px', color:C.text, lineHeight:1 }}>Summer Training</h1>
          <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.62rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase', marginTop:4 }}>
            {DAY_NAMES[today.getDay()]}, {MONTH_NAMES[today.getMonth()]} {today.getDate()} · Temple Landry
          </div>
        </div>
        <div style={{ display:'flex', gap:32 }}>
          {[{ val:streak, label:'Day Streak' },{ val:totalSessions, label:'Sessions' },{ val:`${goalsComplete}/${goals.length}`, label:'Goals' }].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:'1.7rem', color:C.text, lineHeight:1 }}>{s.val}</div>
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.55rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.surface, paddingLeft:8 }}>
        {TABS.map(t => (
          <button key={t.id} className="tab-b" onClick={() => !t.locked && setTab(t.id)} style={{
            background:'none', border:'none', cursor:t.locked ? 'default' : 'pointer',
            padding:'12px 20px', fontFamily:"'DM Mono', monospace", fontSize:'0.63rem', letterSpacing:'0.08em', textTransform:'uppercase',
            color: tab===t.id ? C.text : C.muted,
            borderBottom: tab===t.id ? `2px solid ${C.text}` : '2px solid transparent',
            opacity: t.locked ? 0.35 : 1, transition:'color 0.12s',
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <div style={{ padding:'60px', textAlign:'center', fontFamily:"'DM Mono', monospace", fontSize:'0.7rem', color:C.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>Loading...</div>}

      {/* TODAY */}
      {!loading && tab==='today' && (
        <div style={{ padding:'32px 48px', maxWidth:800, margin:'0 auto' }}>
          {!todayPlan.isActive ? (
            <div style={{ textAlign:'center', padding:'80px 0' }}>
              <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:'2.8rem', color:C.border }}>Rest Day</div>
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.68rem', color:C.muted, marginTop:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {today < WORK_START ? 'Training starts June 22' : 'Weekends off. Recover.'}
              </div>
              <div style={{ marginTop:16, fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', color:C.muted }}>Head to the <span onClick={()=>setTab('log')} style={{ textDecoration:'underline', cursor:'pointer' }}>Log tab</span> to track food & workouts.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:28 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                  <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.63rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase' }}>Today's Plan</div>
                  <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.68rem', color:pct===100?'#2d5a28':C.muted }}>{done}/{total}{pct===100?' · Done ✓':`  ·  ${pct}%`}</div>
                </div>
                <div style={{ height:2, background:C.border, borderRadius:1, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:C.text, borderRadius:1, transition:'width 0.4s ease' }}/>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:36 }}>
                {todayPlan.blocks.map(block => {
                  const isDone = !!todayCI[block.id]
                  return (
                    <div key={block.id} className="brow" onClick={() => toggleCheckin(today, block.id)} style={{ display:'flex', alignItems:'center', gap:14, background:isDone?block.color.bg:C.surface, border:`1px solid ${isDone?block.color.border:C.border}`, borderRadius:8, padding:'13px 16px' }}>
                      <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, border:`1.5px solid ${isDone?block.color.text:C.border}`, background:isDone?block.color.text:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                        {isDone && <span style={{ color:block.color.bg, fontSize:'0.6rem', fontWeight:800 }}>✓</span>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'0.88rem', color:isDone?block.color.text:C.text }}>{block.label}</div>
                      </div>
                      {isDone && <span style={{ fontSize:'0.58rem', fontFamily:"'DM Mono', monospace", padding:'2px 8px', borderRadius:10, background:block.color.text+'22', color:block.color.text, border:`1px solid ${block.color.border}`, letterSpacing:'0.04em' }}>DONE</span>}
                    </div>
                  )
                })}
              </div>
              <div>
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.63rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14 }}>Coach Notes / Log</div>
                {todayNotes.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                    {todayNotes.map((n,i) => (
                      <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 16px' }}>
                        <div style={{ fontSize:'0.85rem', color:C.text, lineHeight:1.55 }}>{n.text}</div>
                        <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.58rem', color:C.muted, marginTop:5 }}>{n.ts}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <input value={noteInput} onChange={e=>setNoteInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveNote()} placeholder="Add a note, coach correction, assignment..." style={{ flex:1, ...inputStyle }} />
                  <button onClick={saveNote} disabled={saving} style={saveBtnStyle}>{saving?'...':'Save'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CALENDAR */}
      {!loading && tab==='calendar' && (
        <div style={{ padding:'32px 48px', maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:28 }}>
            {[{label:'Solid Core',color:C.solid},{label:'CorePower',color:C.cp},{label:'Lift',color:C.lift},{label:'Practice',color:C.gym},{label:'Work',color:C.work},{label:'Run',color:C.run},{label:'PT',color:C.pt}].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:l.color.bg, border:`1px solid ${l.color.border}` }}/>
                <span style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.6rem', color:C.mutedDark, textTransform:'uppercase', letterSpacing:'0.04em' }}>{l.label}</span>
              </div>
            ))}
          </div>
          {[[2026,5],[2026,6]].map(([yr,mo]) => {
            const cells = buildMonthCells(yr, mo)
            return (
              <div key={mo} style={{ marginBottom:36 }}>
                <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:'1.4rem', color:C.text, marginBottom:10 }}>{MONTH_NAMES[mo]} {yr}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3 }}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.58rem', color:C.muted, textAlign:'center', padding:'4px 0', letterSpacing:'0.05em', textTransform:'uppercase' }}>{d}</div>
                  ))}
                  {cells.map((date,i) => {
                    if (!date) return <div key={i}/>
                    const plan    = getDayPlan(date)
                    const isToday = dateKey(date)===todayKey
                    const dc      = checkins[dateKey(date)]||{}
                    const allDone = plan.isActive && plan.blocks.length>0 && plan.blocks.every(b=>dc[b.id])
                    return (
                      <div key={i} className="cal-day-cell" style={{ background:plan.isWeekend?C.borderLight:plan.isActive?C.surface:'#fafaf7', border:`1px solid ${isToday?C.text:C.border}`, borderRadius:6, padding:'6px 7px', minHeight:88, opacity:plan.isWeekend?0.5:1, transition:'border-color 0.12s' }}>
                        <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', color:plan.isActive?C.text:C.muted, fontWeight:isToday?700:400, marginBottom:4 }}>
                          {date.getDate()}{allDone&&<span style={{ marginLeft:4, color:'#2d5a28', fontSize:'0.55rem' }}>✓</span>}
                        </div>
                        {plan.blocks.map(block => (
                          <div key={block.id} style={{ display:'block', fontSize:'0.52rem', fontWeight:600, padding:'1px 4px', borderRadius:2, marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', background:block.color.bg, color:block.color.text, border:`1px solid ${block.color.border}`, opacity:dc[block.id]?1:0.45 }}>
                            {block.label}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LOG TAB */}
      {!loading && tab==='log' && (
        <div style={{ padding:'32px 48px', maxWidth:1200, margin:'0 auto' }}>

          {/* Date Navigation */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
            <button onClick={() => setLogDate(d => { const nd=new Date(d); nd.setDate(nd.getDate()-1); return nd })} style={{ background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:6, padding:'8px 14px', color:C.muted, fontFamily:"'DM Mono', monospace", fontSize:'0.7rem', cursor:'pointer' }}>← Prev</button>
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontFamily:"'DM Serif Display', serif", fontSize:'1.5rem', color:C.text }}>
                {DAY_NAMES[logDate.getDay()]}, {MONTH_NAMES[logDate.getMonth()]} {logDate.getDate()}
              </div>
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.6rem', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>
                {isLogToday ? 'Today' : logDate.getFullYear()}
              </div>
            </div>
            <button onClick={() => setLogDate(d => { const nd=new Date(d); nd.setDate(nd.getDate()+1); return nd })} style={{ background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:6, padding:'8px 14px', color:C.muted, fontFamily:"'DM Mono', monospace", fontSize:'0.7rem', cursor:'pointer' }}>Next →</button>
            {!isLogToday && (
              <button onClick={() => setLogDate(new Date())} style={{ background:C.text, border:'none', borderRadius:6, padding:'8px 14px', color:C.bg, fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', letterSpacing:'0.04em', textTransform:'uppercase', cursor:'pointer' }}>Today</button>
            )}
          </div>

          {/* Desktop 2-column layout */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>

            {/* FOOD LOG */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'24px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.7rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase' }}>Food Log</div>
                <button onClick={()=>setAddingFood(!addingFood)} className="add-btn" style={{ background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:6, padding:'6px 14px', color:C.muted, fontFamily:"'DM Mono', monospace", fontSize:'0.6rem', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }}>
                  {addingFood ? 'Cancel' : '+ Add'}
                </button>
              </div>

              {logFood.length===0 && !addingFood && (
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.7rem', color:C.muted, padding:'32px 0', textAlign:'center' }}>No food logged{isLogToday ? ' yet today' : ' this day'}.</div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:addingFood?16:0 }}>
                {MEAL_TYPES.map(mt => {
                  const entries = logFood.filter(e => e.meal_type===mt.id)
                  if (entries.length===0) return null
                  return (
                    <div key={mt.id}>
                      <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.62rem', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{mt.icon} {mt.label}</div>
                      {entries.map(entry => (
                        <div key={entry.id} className="log-row" style={{ display:'flex', alignItems:'center', gap:12, background:C.bg, border:`1px solid ${C.borderLight}`, borderRadius:8, padding:'12px 16px', marginBottom:6 }}>
                          <div style={{ flex:1, fontSize:'0.9rem', color:C.text }}>{entry.description}</div>
                          <button className="del-btn" onClick={()=>deleteFoodEntry(entry.id)} style={{ opacity:0, background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:'0.85rem', flexShrink:0, transition:'opacity 0.15s' }}>x</button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {addingFood && (
                <div style={{ background:C.bg, border:`1px solid ${C.borderLight}`, borderRadius:10, padding:'18px' }}>
                  <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                    <select value={newFood.meal_type} onChange={e=>setNewFood(p=>({...p,meal_type:e.target.value}))} style={{ flex:'0 0 150px', ...inputStyle }}>
                      {MEAL_TYPES.map(mt=><option key={mt.id} value={mt.id}>{mt.icon} {mt.label}</option>)}
                    </select>
                    <input value={newFood.description} onChange={e=>setNewFood(p=>({...p,description:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&saveFood()} placeholder="What did you eat?" style={{ flex:1, ...inputStyle }}/>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={saveFood} style={saveBtnStyle}>Save</button>
                    <button onClick={()=>setAddingFood(false)} style={cancelBtnStyle}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* WORKOUT LOG */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'24px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.7rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase' }}>Workout Log</div>
                <button onClick={()=>setAddingWorkout(!addingWorkout)} className="add-btn" style={{ background:'transparent', border:`1.5px solid ${C.border}`, borderRadius:6, padding:'6px 14px', color:C.muted, fontFamily:"'DM Mono', monospace", fontSize:'0.6rem', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }}>
                  {addingWorkout ? 'Cancel' : '+ Add'}
                </button>
              </div>

              {logWorkouts.length===0 && !addingWorkout && (
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.7rem', color:C.muted, padding:'32px 0', textAlign:'center' }}>No workouts logged{isLogToday ? ' yet' : ' this day'}.</div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:addingWorkout?16:0 }}>
                {logWorkouts.map(w => (
                  <div key={w.id} className="log-row" style={{ display:'flex', alignItems:'flex-start', gap:14, background:C.bg, border:`1px solid ${C.borderLight}`, borderRadius:8, padding:'14px 16px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:w.notes?6:0 }}>
                        <span style={{ fontWeight:600, fontSize:'0.95rem', color:C.text }}>{w.type}</span>
                        {w.duration && <span style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', color:C.muted, background:C.borderLight, padding:'2px 8px', borderRadius:4 }}>{w.duration}</span>}
                      </div>
                      {w.notes && <div style={{ fontSize:'0.82rem', color:C.mutedDark, lineHeight:1.45 }}>{w.notes}</div>}
                    </div>
                    <button className="del-btn" onClick={()=>deleteWorkoutEntry(w.id)} style={{ opacity:0, background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:'0.85rem', flexShrink:0, transition:'opacity 0.15s' }}>x</button>
                  </div>
                ))}
              </div>

              {addingWorkout && (
                <div style={{ background:C.bg, border:`1px solid ${C.borderLight}`, borderRadius:10, padding:'18px' }}>
                  <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                    <select value={newWorkout.type} onChange={e=>setNewWorkout(p=>({...p,type:e.target.value}))} style={{ flex:1, ...inputStyle }}>
                      {WORKOUT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={newWorkout.duration} onChange={e=>setNewWorkout(p=>({...p,duration:e.target.value}))} placeholder="Duration (e.g. 45 min)" style={{ flex:1, ...inputStyle }}/>
                  </div>
                  <input value={newWorkout.notes} onChange={e=>setNewWorkout(p=>({...p,notes:e.target.value}))} placeholder="Notes (optional)" style={{ width:'100%', ...inputStyle, marginBottom:12 }}/>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={saveWorkout} style={saveBtnStyle}>Save</button>
                    <button onClick={()=>setAddingWorkout(false)} style={cancelBtnStyle}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* GOALS */}
      {!loading && tab==='goals' && (
        <div style={{ padding:'32px 48px', maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:28 }}>
            <div style={{ flex:1, height:2, background:C.border, borderRadius:1, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${goals.length>0?Math.round((goalsComplete/goals.length)*100):0}%`, background:C.text, borderRadius:1, transition:'width 0.4s ease' }}/>
            </div>
            <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', color:C.muted, whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.05em' }}>{goalsComplete}/{goals.length} Complete</div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
            {[{id:'all',label:'All'},...CATS].map(f => (
              <button key={f.id} onClick={()=>setFilterCat(f.id)} style={{ background:filterCat===f.id?C.text:'transparent', border:`1.5px solid ${filterCat===f.id?C.text:C.border}`, borderRadius:4, padding:'4px 12px', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:'0.6rem', letterSpacing:'0.06em', textTransform:'uppercase', color:filterCat===f.id?C.bg:C.muted, transition:'all 0.12s' }}>{f.label}</button>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
            {filteredGoals.length===0 && <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.68rem', color:C.muted, padding:'24px 0', textTransform:'uppercase', letterSpacing:'0.05em' }}>No goals yet — add one below.</div>}
            {filteredGoals.map(goal => {
              const cat = CATS.find(cc=>cc.id===goal.cat)||CATS[0]
              return (
                <div key={goal.id} className="goal-row brow" onClick={()=>toggleGoal(goal.id)} style={{ display:'flex', alignItems:'flex-start', gap:14, background:goal.done?'#eef5ee':C.surface, border:`1px solid ${goal.done?'#b8d4b5':C.border}`, borderRadius:8, padding:'13px 16px', cursor:'pointer', position:'relative' }}>
                  <div style={{ marginTop:2, width:18, height:18, borderRadius:'50%', flexShrink:0, border:`1.5px solid ${goal.done?'#2d5a28':C.border}`, background:goal.done?'#2d5a28':'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                    {goal.done && <span style={{ color:'white', fontSize:'0.58rem', fontWeight:800 }}>✓</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, flexWrap:'wrap' }}>
                      <div style={{ fontWeight:600, fontSize:'0.88rem', color:goal.done?C.muted:C.text, textDecoration:goal.done?'line-through':'none' }}>{goal.title}</div>
                      <span style={{ fontSize:'0.58rem', fontFamily:"'DM Mono', monospace", padding:'1px 7px', borderRadius:10, background:cat.color+'18', color:cat.color, border:`1px solid ${cat.color}33`, letterSpacing:'0.04em', textTransform:'uppercase' }}>{cat.label}</span>
                    </div>
                    {goal.deadline && <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.58rem', color:C.muted, marginBottom:goal.note?4:0 }}>Target: {goal.deadline}</div>}
                    {goal.note && <div style={{ fontSize:'0.76rem', color:C.muted, lineHeight:1.45 }}>{goal.note}</div>}
                  </div>
                  <button className="del-btn" onClick={e=>{e.stopPropagation();deleteGoal(goal.id)}} style={{ opacity:0, background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:'0.85rem', padding:'0 4px', flexShrink:0, transition:'opacity 0.15s' }}>✕</button>
                </div>
              )
            })}
          </div>
          {!addingGoal ? (
            <button className="add-btn" onClick={()=>setAddingGoal(true)} style={{ width:'100%', background:'transparent', border:`1.5px dashed ${C.border}`, borderRadius:8, padding:'13px', color:C.muted, fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', transition:'border-color 0.12s, color 0.12s' }}>+ Add Goal</button>
          ) : (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'20px' }}>
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.63rem', color:C.muted, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14 }}>New Goal</div>
              <input value={newGoal.title} onChange={e=>setNewGoal(p=>({...p,title:e.target.value}))} placeholder="Goal title..." style={{ width:'100%', ...inputStyle, marginBottom:10 }}/>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <select value={newGoal.cat} onChange={e=>setNewGoal(p=>({...p,cat:e.target.value}))} style={{ flex:1, ...inputStyle }}>
                  {CATS.map(cc=><option key={cc.id} value={cc.id}>{cc.label}</option>)}
                </select>
                <input value={newGoal.deadline} onChange={e=>setNewGoal(p=>({...p,deadline:e.target.value}))} placeholder="Target (e.g. Aug 5)" style={{ flex:1, ...inputStyle }}/>
              </div>
              <input value={newGoal.note} onChange={e=>setNewGoal(p=>({...p,note:e.target.value}))} placeholder="Notes or progression plan (optional)..." style={{ width:'100%', ...inputStyle, marginBottom:14 }}/>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={saveGoal} style={saveBtnStyle}>Save</button>
                <button onClick={()=>setAddingGoal(false)} style={cancelBtnStyle}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
