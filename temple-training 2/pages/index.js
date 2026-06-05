import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Design tokens ────────────────────────────────────────────────────────────
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
const GYM_EVENTS    = ['Bars','Beam','Floor','Vault','All-Around','Conditioning','General']

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDayPlan(date) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return { isActive:false, isWeekend:true,  blocks:[], labels:[] }
  if (d < WORK_START || d >= WORK_END) return { isActive:false, isWeekend:false, blocks:[], labels:[] }
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

function getLast7Keys() {
  const keys = []
  for (let i=0; i<7; i++) {
    const d = new Date(); d.setDate(d.getDate()-i)
    keys.push(dateKey(d))
  }
  return keys
}

// ─── Shared sub-components ───────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.63rem', color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14 }}>{children}</div>
)

const AddBtn = ({ onClick, children }) => (
  <button onClick={onClick} style={{ background:'transparent', border:'1.5px dashed #e8e3da', borderRadius:8, padding:'13px', width:'100%', color:'#aaa', fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
    {children}
  </button>
)

const SaveBtn = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} style={{ background:'#1a1a1a', border:'none', borderRadius:6, padding:'10px 20px', color:'#F5F0E8', fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }}>
    {children||'Save'}
  </button>
)

const CancelBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background:'transparent', border:'1px solid #e8e3da', borderRadius:6, padding:'10px 20px', color:'#aaa', fontFamily:"'DM Mono',monospace", fontSize:'0.65rem', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }}>
    Cancel
  </button>
)

const InputStyle = { background:'#F5F0E8', border:'1px solid #e8e3da', borderRadius:6, padding:'10px 14px', color:'#1a1a1a', fontSize:'0.85rem', fontFamily:"'DM Sans',sans-serif" }

const AICard = ({ text, loading, onGenerate, label, icon }) => (
  <div style={{ background:'#faf8f4', border:'1px solid #e8e3da', borderRadius:10, padding:'16px 18px', marginBottom:28 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: text||loading ? 10 : 0 }}>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.6rem', color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>{icon} {label}</div>
      {!loading && <button onClick={onGenerate} style={{ background:'#1a1a1a', border:'none', borderRadius:4, padding:'4px 10px', color:'#F5F0E8', fontFamily:"'DM Mono',monospace", fontSize:'0.58rem', letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer' }}>
        {text ? 'Refresh' : 'Generate'}
      </button>}
    </div>
    {loading && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:'0.7rem', color:'#aaa', fontStyle:'italic' }}>thinking...</div>}
    {text && !loading && <div style={{ fontSize:'0.85rem', color:'#1a1a1a', lineHeight:1.6 }}>{text}</div>}
  </div>
)

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab]   = useState('today')
  const [today]         = useState(new Date())
  const [loading, setLoading] = useState(true)

  // Data state
  const [checkins, setCheckins]       = useState({})
  const [notes, setNotes]             = useState({})
  const [goals, setGoals]             = useState([])
  const [foodLog, setFoodLog]         = useState({})
  const [workoutLog, setWorkoutLog]   = useState({})
  const [skills, setSkills]           = useState([])
  const [practiceEntries, setPracticeEntries] = useState([])

  // AI state
  const [dailyBrief, setDailyBrief]   = useState('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [weeklyReview, setWeeklyReview] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [goalNudge, setGoalNudge]     = useState('')
  const [nudgeLoading, setNudgeLoading] = useState(false)

  // Form state
  const [noteInput, setNoteInput]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [newFood, setNewFood]         = useState({ meal_type:'breakfast', description:'' })
  const [addingFood, setAddingFood]   = useState(false)
  const [newWorkout, setNewWorkout]   = useState({ type:'Gymnastics', duration:'', notes:'' })
  const [addingWorkout, setAddingWorkout] = useState(false)
  const [newGoal, setNewGoal]         = useState({ title:'', cat:'gym', deadline:'', note:'' })
  const [addingGoal, setAddingGoal]   = useState(false)
  const [filterCat, setFilterCat]     = useState('all')
  const [newSkill, setNewSkill]       = useState({ name:'', event:'Bars' })
  const [addingSkill, setAddingSkill] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [newPractice, setNewPractice] = useState({ skill_id:'', skill_name:'', entry:'' })
  const [addingPractice, setAddingPractice] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  // ── Data loading ──────────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true)
    const [{ data:ci },{ data:no },{ data:go },{ data:fl },{ data:wl },{ data:sk },{ data:pe }] = await Promise.all([
      supabase.from('checkins').select('*'),
      supabase.from('notes').select('*').order('created_at',{ascending:true}),
      supabase.from('goals').select('*').order('created_at',{ascending:true}),
      supabase.from('food_log').select('*').order('created_at',{ascending:true}),
      supabase.from('workout_log').select('*').order('created_at',{ascending:true}),
      supabase.from('skills').select('*').order('created_at',{ascending:true}),
      supabase.from('practice_entries').select('*').order('created_at',{ascending:true}),
    ])
    const ciMap={}; (ci||[]).forEach(r=>{if(!ciMap[r.date_key])ciMap[r.date_key]={};ciMap[r.date_key][r.block_id]=r.done})
    const noMap={}; (no||[]).forEach(r=>{if(!noMap[r.date_key])noMap[r.date_key]=[];noMap[r.date_key].push({text:r.text,ts:new Date(r.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})})})
    const flMap={}; (fl||[]).forEach(r=>{if(!flMap[r.date_key])flMap[r.date_key]=[];flMap[r.date_key].push(r)})
    const wlMap={}; (wl||[]).forEach(r=>{if(!wlMap[r.date_key])wlMap[r.date_key]=[];wlMap[r.date_key].push(r)})
    setCheckins(ciMap); setNotes(noMap); setGoals(go||[]); setFoodLog(flMap); setWorkoutLog(wlMap)
    setSkills(sk||[]); setPracticeEntries(pe||[])
    setLoading(false)
  }

  // ── AI calls ──────────────────────────────────────────────────────────────
  async function callAI(action, data) {
    const res = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,data}) })
    const json = await res.json()
    return json.text || ''
  }

  async function generateDailyBrief() {
    setBriefLoading(true)
    const plan = getDayPlan(today)
    const last7 = getLast7Keys()
    let totalPossible=0, totalDone=0
    last7.forEach(k=>{const plan=getDayPlan(new Date(k));if(plan.isActive){totalPossible+=plan.blocks.length;totalDone+=plan.blocks.filter(b=>(checkins[k]||{})[b.id]).length}})
    const weekPct = totalPossible > 0 ? Math.round((totalDone/totalPossible)*100) : 0
    const recentNotes = last7.flatMap(k=>(notes[k]||[]).map(n=>n.text)).slice(-3).join('. ') || 'none'
    const text = await callAI('daily-brief', { dayName:DAY_NAMES[today.getDay()], schedule:plan.blocks.map(b=>b.label), weekPct, recentNotes })
    setDailyBrief(text); setBriefLoading(false)
  }

  async function generateWeeklyReview() {
    setReviewLoading(true)
    const last7 = getLast7Keys()
    let sessionsDone=0, totalPossible=0
    last7.forEach(k=>{const plan=getDayPlan(new Date(k));if(plan.isActive){totalPossible+=plan.blocks.length;sessionsDone+=plan.blocks.filter(b=>(checkins[k]||{})[b.id]).length}})
    const pct = totalPossible > 0 ? Math.round((sessionsDone/totalPossible)*100) : 0
    const foodEntries = last7.reduce((a,k)=>a+(foodLog[k]||[]).length,0)
    const skillEntries = practiceEntries.filter(e=>last7.includes(e.date_key)).length
    const notesThisWeek = last7.flatMap(k=>(notes[k]||[]).map(n=>n.text)).join('. ') || 'none'
    const text = await callAI('weekly-review', { sessionsDone, pct, foodEntries, skillEntries, notes:notesThisWeek })
    setWeeklyReview(text); setReviewLoading(false)
  }

  async function generateGoalNudge() {
    setNudgeLoading(true)
    const last7 = getLast7Keys()
    const weekSummary = `${last7.reduce((a,k)=>a+(workoutLog[k]||[]).length+(foodLog[k]||[]).length,0)} log entries, ${last7.reduce((a,k)=>a+getDayPlan(new Date(k)).blocks.filter(b=>(checkins[k]||{})[b.id]).length,0)} sessions checked off`
    const text = await callAI('goal-nudge', { goals:goals.slice(0,6), weekSummary })
    setGoalNudge(text); setNudgeLoading(false)
  }

  // ── Checkins ──────────────────────────────────────────────────────────────
  async function toggleCheckin(date, blockId) {
    const key=dateKey(date); const cur=checkins[key]?.[blockId]||false
    setCheckins(prev=>({...prev,[key]:{...(prev[key]||{}),[blockId]:!cur}}))
    await supabase.from('checkins').upsert({date_key:key,block_id:blockId,done:!cur},{onConflict:'date_key,block_id'})
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  async function saveNote() {
    if (!noteInput.trim()) return; setSaving(true)
    const key=dateKey(today); const text=noteInput.trim()
    const{data}=await supabase.from('notes').insert({date_key:key,text}).select().single()
    if(data) setNotes(prev=>({...prev,[key]:[...(prev[key]||[]),{text,ts:new Date(data.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}]}))
    setNoteInput(''); setSaving(false)
  }

  // ── Goals ─────────────────────────────────────────────────────────────────
  async function toggleGoal(id) {
    const g=goals.find(x=>x.id===id); if(!g) return
    setGoals(prev=>prev.map(x=>x.id===id?{...x,done:!x.done}:x))
    await supabase.from('goals').update({done:!g.done}).eq('id',id)
  }
  async function saveGoal() {
    if(!newGoal.title.trim()) return
    const{data}=await supabase.from('goals').insert({title:newGoal.title.trim(),cat:newGoal.cat,deadline:newGoal.deadline||null,note:newGoal.note||null,done:false}).select().single()
    if(data) setGoals(prev=>[...prev,data])
    setNewGoal({title:'',cat:'gym',deadline:'',note:''}); setAddingGoal(false)
  }
  async function deleteGoal(id) {
    setGoals(prev=>prev.filter(g=>g.id!==id)); await supabase.from('goals').delete().eq('id',id)
  }

  // ── Food ──────────────────────────────────────────────────────────────────
  async function saveFood() {
    if(!newFood.description.trim()) return
    const key=dateKey(today)
    // Save first, then run AI in background
    const{data}=await supabase.from('food_log').insert({date_key:key,meal_type:newFood.meal_type,description:newFood.description.trim()}).select().single()
    if(data) {
      setFoodLog(prev=>({...prev,[key]:[...(prev[key]||[]),data]}))
      setNewFood({meal_type:'breakfast',description:''}); setAddingFood(false)
      // AI analysis in background
      const plan=getDayPlan(today)
      callAI('meal-analysis',{meal:newFood.description.trim(),isTrainingDay:plan.isActive}).then(async text=>{
        try {
          const clean=text.replace(/```json|```/g,'').trim()
          const parsed=JSON.parse(clean)
          await supabase.from('food_log').update({ai_protein:parsed.protein,ai_carbs:parsed.carbs,ai_fats:parsed.fats,ai_note:parsed.note}).eq('id',data.id)
          setFoodLog(prev=>({...prev,[key]:(prev[key]||[]).map(e=>e.id===data.id?{...e,...{ai_protein:parsed.protein,ai_carbs:parsed.carbs,ai_fats:parsed.fats,ai_note:parsed.note}}:e)}))
        } catch(_){}
      })
    }
  }
  async function deleteFoodEntry(id) {
    const key=dateKey(today)
    setFoodLog(prev=>({...prev,[key]:(prev[key]||[]).filter(e=>e.id!==id)}))
    await supabase.from('food_log').delete().eq('id',id)
  }

  // ── Workouts ──────────────────────────────────────────────────────────────
  async function saveWorkout() {
    if(!newWorkout.type) return; const key=dateKey(today)
    const{data}=await supabase.from('workout_log').insert({date_key:key,type:newWorkout.type,duration:newWorkout.duration||null,notes:newWorkout.notes||null}).select().single()
    if(data) setWorkoutLog(prev=>({...prev,[key]:[...(prev[key]||[]),data]}))
    setNewWorkout({type:'Gymnastics',duration:'',notes:''}); setAddingWorkout(false)
  }
  async function deleteWorkoutEntry(id) {
    const key=dateKey(today)
    setWorkoutLog(prev=>({...prev,[key]:(prev[key]||[]).filter(e=>e.id!==id)}))
    await supabase.from('workout_log').delete().eq('id',id)
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  async function saveSkill() {
    if(!newSkill.name.trim()) return
    const{data}=await supabase.from('skills').insert({name:newSkill.name.trim(),event:newSkill.event}).select().single()
    if(data) setSkills(prev=>[...prev,data])
    setNewSkill({name:'',event:'Bars'}); setAddingSkill(false)
  }
  async function deleteSkill(id) {
    setSkills(prev=>prev.filter(s=>s.id!==id))
    await supabase.from('skills').delete().eq('id',id)
  }

  // ── Practice entries ──────────────────────────────────────────────────────
  async function savePracticeEntry() {
    if(!newPractice.entry.trim()||!newPractice.skill_id) return
    setPracticeLoading(true)
    const key=dateKey(today)
    const skillEntries=practiceEntries.filter(e=>e.skill_id===newPractice.skill_id)
    // Call AI first to structure the entry
    let aiData={}
    try {
      const text=await callAI('skill-analysis',{skillName:newPractice.skill_name,entry:newPractice.entry,recentEntries:skillEntries})
      const clean=text.replace(/```json|```/g,'').trim()
      const parsed=JSON.parse(clean)
      aiData={ai_went_well:parsed.went_well||null,ai_needs_work:parsed.needs_work||null,ai_coach_feedback:parsed.coach_feedback||null,ai_pattern:parsed.pattern||null}
    } catch(_){}
    const{data}=await supabase.from('practice_entries').insert({
      date_key:key,skill_id:newPractice.skill_id,skill_name:newPractice.skill_name,
      entry:newPractice.entry.trim(),...aiData
    }).select().single()
    if(data) setPracticeEntries(prev=>[...prev,data])
    setNewPractice({skill_id:'',skill_name:'',entry:''}); setAddingPractice(false); setPracticeLoading(false)
  }
  async function deletePracticeEntry(id) {
    setPracticeEntries(prev=>prev.filter(e=>e.id!==id))
    await supabase.from('practice_entries').delete().eq('id',id)
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const todayKey      = dateKey(today)
  const todayPlan     = getDayPlan(today)
  const todayCI       = checkins[todayKey]  || {}
  const todayNotes    = notes[todayKey]     || []
  const todayFood     = foodLog[todayKey]   || []
  const todayWorkouts = workoutLog[todayKey]|| []
  const done          = todayPlan.blocks.filter(b=>todayCI[b.id]).length
  const total         = todayPlan.blocks.length
  const pct           = total>0 ? Math.round((done/total)*100) : 0
  const goalsComplete = goals.filter(g=>g.done).length
  const filteredGoals = filterCat==='all' ? goals : goals.filter(g=>g.cat===filterCat)

  function calcStreak() {
    let s=0; const d=new Date(today); d.setDate(d.getDate()-1)
    for(let i=0;i<60;i++){
      const plan=getDayPlan(d); if(!plan.isActive){d.setDate(d.getDate()-1);continue}
      const dc=checkins[dateKey(d)]||{}; if(!plan.blocks.some(b=>dc[b.id])) break
      s++; d.setDate(d.getDate()-1)
    }
    return s
  }

  const streak        = loading ? '—' : calcStreak()
  const totalSessions = Object.values(checkins).reduce((a,dc)=>a+Object.values(dc).filter(Boolean).length,0)

  const TABS = [
    {id:'today',   label:'TODAY'},
    {id:'calendar',label:'CALENDAR'},
    {id:'log',     label:'LOG'},
    {id:'skills',  label:'SKILLS'},
    {id:'goals',   label:'GOALS'},
    {id:'weekly',  label:'WEEKLY'},
  ]

  // ── Styles ─────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { background:#F5F0E8; }
    input:focus, textarea:focus, select:focus { outline:none; }
    .brow   { transition:background 0.12s; cursor:pointer; }
    .brow:hover   { background:#f8f4ec !important; }
    .goal-row:hover .del-btn { opacity:1 !important; }
    .log-row:hover  .del-btn { opacity:1 !important; }
    .skill-row:hover .del-btn { opacity:1 !important; }
    .pe-row:hover   .del-btn { opacity:1 !important; }
    .tab-b:hover { color:#1a1a1a !important; }
    .cal-day-cell:hover { border-color:#aaa !important; }
  `

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{background:C.bg,minHeight:'100vh',color:C.text,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:'20px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:1200,margin:'0 auto'}}>
        <div>
          <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.9rem',letterSpacing:'-0.5px',color:C.text,lineHeight:1}}>Summer Training</h1>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.62rem',color:C.muted,letterSpacing:'0.06em',textTransform:'uppercase',marginTop:4}}>
            {DAY_NAMES[today.getDay()]}, {MONTH_NAMES[today.getMonth()]} {today.getDate()} · Temple Landry
          </div>
        </div>
        <div style={{display:'flex',gap:32}}>
          {[{val:streak,label:'Day Streak'},{val:totalSessions,label:'Sessions'},{val:`${goalsComplete}/${goals.length}`,label:'Goals'}].map(s=>(
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.7rem',color:C.text,lineHeight:1}}>{s.val}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.55rem',color:C.muted,letterSpacing:'0.06em',textTransform:'uppercase',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,background:C.surface,paddingLeft:48,overflowX:'auto',maxWidth:1200,margin:'0 auto'}}>
        {TABS.map(t=>(
          <button key={t.id} className="tab-b" onClick={()=>setTab(t.id)} style={{
            background:'none',border:'none',cursor:'pointer',whiteSpace:'nowrap',
            padding:'12px 20px',fontFamily:"'DM Mono',monospace",fontSize:'0.63rem',letterSpacing:'0.08em',textTransform:'uppercase',
            color:tab===t.id?C.text:C.muted,
            borderBottom:tab===t.id?`2px solid ${C.text}`:'2px solid transparent',
            transition:'color 0.12s',
          }}>{t.label}</button>
        ))}
      </div>

      {loading&&<div style={{padding:'60px',textAlign:'center',fontFamily:"'DM Mono',monospace",fontSize:'0.7rem',color:C.muted,letterSpacing:'0.08em',textTransform:'uppercase'}}>Loading...</div>}

      {/* ── TODAY ── */}
      {!loading&&tab==='today'&&(
        <div style={{padding:'32px 48px',maxWidth:900,margin:'0 auto'}}>

          <AICard text={dailyBrief} loading={briefLoading} onGenerate={generateDailyBrief} label="Daily Brief" icon="✦" />

          {!todayPlan.isActive?(
            <div style={{textAlign:'center',padding:'60px 0'}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'2.8rem',color:C.border}}>Rest Day</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.68rem',color:C.muted,marginTop:8,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                {today<WORK_START?'Training starts June 22':'Weekends off. Recover.'}
              </div>
            </div>
          ):(
            <>
              <div style={{marginBottom:28}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
                  <SectionLabel>Today&apos;s Plan</SectionLabel>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.68rem',color:pct===100?'#2d5a28':C.muted}}>{done}/{total}{pct===100?' · Done ✓':'  ·  '+pct+'%'}</div>
                </div>
                <div style={{height:2,background:C.border,borderRadius:1,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:C.text,borderRadius:1,transition:'width 0.4s ease'}}/>
                </div>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:36}}>
                {todayPlan.blocks.map(block=>{
                  const isDone=!!todayCI[block.id]
                  return(
                    <div key={block.id} className="brow" onClick={()=>toggleCheckin(today,block.id)} style={{display:'flex',alignItems:'center',gap:14,background:isDone?block.color.bg:C.surface,border:`1px solid ${isDone?block.color.border:C.border}`,borderRadius:8,padding:'13px 16px'}}>
                      <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,border:`1.5px solid ${isDone?block.color.text:C.border}`,background:isDone?block.color.text:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
                        {isDone&&<span style={{color:block.color.bg,fontSize:'0.6rem',fontWeight:800}}>✓</span>}
                      </div>
                      <div style={{flex:1,fontWeight:600,fontSize:'0.88rem',color:isDone?block.color.text:C.text}}>{block.label}</div>
                      {isDone&&<span style={{fontSize:'0.58rem',fontFamily:"'DM Mono',monospace",padding:'2px 8px',borderRadius:10,background:block.color.text+'22',color:block.color.text,border:`1px solid ${block.color.border}`,letterSpacing:'0.04em'}}>DONE</span>}
                    </div>
                  )
                })}
              </div>

              <SectionLabel>Coach Notes / Log</SectionLabel>
              {todayNotes.map((n,i)=>(
                <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 16px',marginBottom:8}}>
                  <div style={{fontSize:'0.85rem',color:C.text,lineHeight:1.55}}>{n.text}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted,marginTop:5}}>{n.ts}</div>
                </div>
              ))}
              <div style={{display:'flex',gap:8,marginTop:4}}>
                <input value={noteInput} onChange={e=>setNoteInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveNote()} placeholder="Add a note, coach correction, assignment..." style={{flex:1,...InputStyle}}/>
                <SaveBtn onClick={saveNote} disabled={saving}>{saving?'...':'Save'}</SaveBtn>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CALENDAR ── */}
      {!loading&&tab==='calendar'&&(
        <div style={{padding:'32px 48px',maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:28}}>
            {[{label:'Solid Core',color:C.solid},{label:'CorePower',color:C.cp},{label:'Lift',color:C.lift},{label:'Practice',color:C.gym},{label:'Work',color:C.work},{label:'Run',color:C.run},{label:'PT',color:C.pt}].map(l=>(
              <div key={l.label} style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:10,height:10,borderRadius:2,background:l.color.bg,border:`1px solid ${l.color.border}`}}/>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',color:C.mutedDark,textTransform:'uppercase',letterSpacing:'0.04em'}}>{l.label}</span>
              </div>
            ))}
          </div>
          {[[2026,5],[2026,6]].map(([yr,mo])=>{
            const cells=buildMonthCells(yr,mo)
            return(
              <div key={mo} style={{marginBottom:36}}>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',color:C.text,marginBottom:10}}>{MONTH_NAMES[mo]} {yr}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
                    <div key={d} style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted,textAlign:'center',padding:'4px 0',letterSpacing:'0.05em',textTransform:'uppercase'}}>{d}</div>
                  ))}
                  {cells.map((date,i)=>{
                    if(!date) return<div key={i}/>
                    const plan=getDayPlan(date); const isToday=dateKey(date)===todayKey
                    const dc=checkins[dateKey(date)]||{}; const allDone=plan.isActive&&plan.blocks.length>0&&plan.blocks.every(b=>dc[b.id])
                    return(
                      <div key={i} className="cal-day-cell" style={{background:plan.isWeekend?C.borderLight:plan.isActive?C.surface:'#fafaf7',border:`1px solid ${isToday?C.text:C.border}`,borderRadius:6,padding:'6px 7px',minHeight:88,opacity:plan.isWeekend?0.5:1,transition:'border-color 0.12s'}}>
                        <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.65rem',color:plan.isActive?C.text:C.muted,fontWeight:isToday?700:400,marginBottom:4}}>
                          {date.getDate()}{allDone&&<span style={{marginLeft:4,color:'#2d5a28',fontSize:'0.55rem'}}>✓</span>}
                        </div>
                        {plan.blocks.map(block=>(
                          <div key={block.id} style={{display:'block',fontSize:'0.52rem',fontWeight:600,padding:'1px 4px',borderRadius:2,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',background:block.color.bg,color:block.color.text,border:`1px solid ${block.color.border}`,opacity:dc[block.id]?1:0.45}}>
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

      {/* ── LOG ── */}
      {!loading&&tab==='log'&&(
        <div style={{padding:'32px 48px',maxWidth:900,margin:'0 auto'}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',color:C.text,marginBottom:4}}>{DAY_NAMES[today.getDay()]}, {MONTH_NAMES[today.getMonth()]} {today.getDate()}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:32}}>Daily log — food & workouts</div>

          {/* Food */}
          <div style={{marginBottom:36}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <SectionLabel>🍽️ Food Log</SectionLabel>
              <button onClick={()=>setAddingFood(!addingFood)} style={{background:'transparent',border:`1.5px solid ${C.border}`,borderRadius:6,padding:'4px 12px',color:C.muted,fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',letterSpacing:'0.06em',textTransform:'uppercase',cursor:'pointer'}}>
                {addingFood?'Cancel':'+ Add'}
              </button>
            </div>
            {todayFood.length===0&&!addingFood&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.65rem',color:C.muted,padding:'8px 0'}}>Nothing logged yet.</div>}
            {MEAL_TYPES.map(mt=>{
              const entries=todayFood.filter(e=>e.meal_type===mt.id)
              if(!entries.length) return null
              return(
                <div key={mt.id} style={{marginBottom:12}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{mt.icon} {mt.label}</div>
                  {entries.map(entry=>(
                    <div key={entry.id} className="log-row" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:'10px 14px',marginBottom:4,position:'relative'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{flex:1,fontSize:'0.85rem',color:C.text}}>{entry.description}</div>
                        <button className="del-btn" onClick={()=>deleteFoodEntry(entry.id)} style={{opacity:0,background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.8rem',transition:'opacity 0.15s'}}>✕</button>
                      </div>
                      {(entry.ai_protein||entry.ai_note)&&(
                        <div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${C.borderLight}`}}>
                          {entry.ai_protein&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted}}>P {entry.ai_protein} · C {entry.ai_carbs} · F {entry.ai_fats}</div>}
                          {entry.ai_note&&<div style={{fontSize:'0.72rem',color:C.mutedDark,marginTop:2,fontStyle:'italic'}}>{entry.ai_note}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
            {addingFood&&(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'16px',marginTop:8}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <select value={newFood.meal_type} onChange={e=>setNewFood(p=>({...p,meal_type:e.target.value}))} style={{flex:'0 0 140px',...InputStyle}}>
                    {MEAL_TYPES.map(mt=><option key={mt.id} value={mt.id}>{mt.icon} {mt.label}</option>)}
                  </select>
                  <input value={newFood.description} onChange={e=>setNewFood(p=>({...p,description:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&saveFood()} placeholder="What did you eat?" style={{flex:1,...InputStyle}}/>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <SaveBtn onClick={saveFood}/>
                  <CancelBtn onClick={()=>setAddingFood(false)}/>
                </div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted,marginTop:10}}>✦ AI will analyze macros automatically</div>
              </div>
            )}
          </div>

          {/* Workouts */}
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <SectionLabel>💪 Workout Log</SectionLabel>
              <button onClick={()=>setAddingWorkout(!addingWorkout)} style={{background:'transparent',border:`1.5px solid ${C.border}`,borderRadius:6,padding:'4px 12px',color:C.muted,fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',letterSpacing:'0.06em',textTransform:'uppercase',cursor:'pointer'}}>
                {addingWorkout?'Cancel':'+ Add'}
              </button>
            </div>
            {todayWorkouts.length===0&&!addingWorkout&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.65rem',color:C.muted,padding:'8px 0'}}>No workouts logged yet.</div>}
            {todayWorkouts.map(w=>(
              <div key={w.id} className="log-row" style={{display:'flex',alignItems:'flex-start',gap:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:'12px 14px',marginBottom:6,position:'relative'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:w.notes?4:0}}>
                    <span style={{fontWeight:600,fontSize:'0.88rem',color:C.text}}>{w.type}</span>
                    {w.duration&&<span style={{fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',color:C.muted}}>{w.duration}</span>}
                  </div>
                  {w.notes&&<div style={{fontSize:'0.78rem',color:C.mutedDark,lineHeight:1.4}}>{w.notes}</div>}
                </div>
                <button className="del-btn" onClick={()=>deleteWorkoutEntry(w.id)} style={{opacity:0,background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.8rem',flexShrink:0,transition:'opacity 0.15s'}}>✕</button>
              </div>
            ))}
            {addingWorkout&&(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'16px',marginTop:8}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <select value={newWorkout.type} onChange={e=>setNewWorkout(p=>({...p,type:e.target.value}))} style={{flex:1,...InputStyle}}>
                    {WORKOUT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={newWorkout.duration} onChange={e=>setNewWorkout(p=>({...p,duration:e.target.value}))} placeholder="Duration" style={{flex:1,...InputStyle}}/>
                </div>
                <input value={newWorkout.notes} onChange={e=>setNewWorkout(p=>({...p,notes:e.target.value}))} placeholder="Notes (optional)" style={{width:'100%',...InputStyle,marginBottom:10}}/>
                <div style={{display:'flex',gap:8}}>
                  <SaveBtn onClick={saveWorkout}/>
                  <CancelBtn onClick={()=>setAddingWorkout(false)}/>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SKILLS ── */}
      {!loading&&tab==='skills'&&(
        <div style={{padding:'32px 48px',maxWidth:900,margin:'0 auto'}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',color:C.text,marginBottom:4}}>Skills Tracker</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:28}}>Log practice · AI structures your notes · patterns surface over time</div>

          {/* Skills list */}
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
            {skills.length===0&&!addingSkill&&(
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.65rem',color:C.muted,padding:'16px 0'}}>No skills added yet. Add your first one below.</div>
            )}
            {skills.map(skill=>{
              const entries=practiceEntries.filter(e=>e.skill_id===skill.id)
              const isOpen=selectedSkill===skill.id
              return(
                <div key={skill.id} style={{background:C.surface,border:`1px solid ${isOpen?C.text:C.border}`,borderRadius:10,overflow:'hidden',transition:'border-color 0.15s'}}>
                  {/* Skill header */}
                  <div className="skill-row" style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',cursor:'pointer',position:'relative'}} onClick={()=>setSelectedSkill(isOpen?null:skill.id)}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:'0.9rem',color:C.text}}>{skill.name}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted,marginTop:2}}>{skill.event} · {entries.length} {entries.length===1?'entry':'entries'}</div>
                    </div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.65rem',color:C.muted}}>{isOpen?'▲':'▼'}</div>
                    <button className="del-btn" onClick={e=>{e.stopPropagation();deleteSkill(skill.id)}} style={{opacity:0,background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.8rem',transition:'opacity 0.15s',marginLeft:4}}>✕</button>
                  </div>

                  {/* Expanded entries */}
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.border}`,padding:'16px 18px'}}>
                      {entries.length===0&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.63rem',color:C.muted,marginBottom:14}}>No entries yet. Log your first session below.</div>}

                      {entries.map(e=>(
                        <div key={e.id} className="pe-row" style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'12px 14px',marginBottom:8,position:'relative'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted}}>{e.date_key}</div>
                            <button className="del-btn" onClick={()=>deletePracticeEntry(e.id)} style={{opacity:0,background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.75rem',transition:'opacity 0.15s'}}>✕</button>
                          </div>
                          <div style={{fontSize:'0.82rem',color:C.text,lineHeight:1.5,marginBottom:e.ai_went_well||e.ai_needs_work?10:0}}>{e.entry}</div>
                          {(e.ai_went_well||e.ai_needs_work)&&(
                            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,display:'flex',flexDirection:'column',gap:4}}>
                              {e.ai_went_well&&<div style={{fontSize:'0.72rem',color:'#2d5a28'}}>✓ {e.ai_went_well}</div>}
                              {e.ai_needs_work&&<div style={{fontSize:'0.72rem',color:'#7a3d1a'}}>→ {e.ai_needs_work}</div>}
                              {e.ai_coach_feedback&&<div style={{fontSize:'0.72rem',color:'#1a4a7a'}}>💬 {e.ai_coach_feedback}</div>}
                              {e.ai_pattern&&<div style={{fontSize:'0.72rem',color:C.muted,fontStyle:'italic',borderTop:`1px solid ${C.borderLight}`,paddingTop:4,marginTop:2}}>Pattern: {e.ai_pattern}</div>}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add entry form */}
                      {addingPractice&&newPractice.skill_id===skill.id?(
                        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'14px'}}>
                          <textarea value={newPractice.entry} onChange={e=>setNewPractice(p=>({...p,entry:e.target.value}))}
                            placeholder="What happened in practice today? Be specific — what you worked, what felt good, what coach said, what broke down..."
                            rows={4} style={{width:'100%',resize:'vertical',background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 14px',color:C.text,fontSize:'0.85rem',fontFamily:"'DM Sans',sans-serif",marginBottom:10}}
                          />
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <SaveBtn onClick={savePracticeEntry} disabled={practiceLoading}>{practiceLoading?'AI analyzing...':'Save + Analyze'}</SaveBtn>
                            <CancelBtn onClick={()=>setAddingPractice(false)}/>
                            {!practiceLoading&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted}}>✦ AI will structure your notes</div>}
                          </div>
                        </div>
                      ):(
                        <button onClick={()=>{setAddingPractice(true);setNewPractice({skill_id:skill.id,skill_name:skill.name,entry:''})}} style={{background:'transparent',border:`1.5px dashed ${C.border}`,borderRadius:7,padding:'10px',width:'100%',color:C.muted,fontFamily:"'DM Mono',monospace",fontSize:'0.62rem',letterSpacing:'0.08em',textTransform:'uppercase',cursor:'pointer'}}>
                          + Log Today&apos;s Session
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!addingSkill?(
            <AddBtn onClick={()=>setAddingSkill(true)}>+ Add Skill</AddBtn>
          ):(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'18px'}}>
              <SectionLabel>New Skill</SectionLabel>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input value={newSkill.name} onChange={e=>setNewSkill(p=>({...p,name:e.target.value}))} placeholder="Skill name (e.g. Front Double Twist)" style={{flex:2,...InputStyle}}/>
                <select value={newSkill.event} onChange={e=>setNewSkill(p=>({...p,event:e.target.value}))} style={{flex:1,...InputStyle}}>
                  {GYM_EVENTS.map(ev=><option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:8}}>
                <SaveBtn onClick={saveSkill}/>
                <CancelBtn onClick={()=>setAddingSkill(false)}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GOALS ── */}
      {!loading&&tab==='goals'&&(
        <div style={{padding:'32px 48px',maxWidth:900,margin:'0 auto'}}>

          <AICard text={goalNudge} loading={nudgeLoading} onGenerate={generateGoalNudge} label="Goal Nudge" icon="◆"/>

          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:24}}>
            <div style={{flex:1,height:2,background:C.border,borderRadius:1,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${goals.length>0?Math.round((goalsComplete/goals.length)*100):0}%`,background:C.text,borderRadius:1,transition:'width 0.4s ease'}}/>
            </div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.65rem',color:C.muted,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.05em'}}>{goalsComplete}/{goals.length} Complete</div>
          </div>

          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
            {[{id:'all',label:'All'},...CATS].map(f=>(
              <button key={f.id} onClick={()=>setFilterCat(f.id)} style={{background:filterCat===f.id?C.text:'transparent',border:`1.5px solid ${filterCat===f.id?C.text:C.border}`,borderRadius:4,padding:'4px 12px',cursor:'pointer',fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',letterSpacing:'0.06em',textTransform:'uppercase',color:filterCat===f.id?C.bg:C.muted,transition:'all 0.12s'}}>{f.label}</button>
            ))}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
            {filteredGoals.length===0&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.68rem',color:C.muted,padding:'24px 0',textTransform:'uppercase',letterSpacing:'0.05em'}}>No goals yet — add one below.</div>}
            {filteredGoals.map(goal=>{
              const cat=CATS.find(cc=>cc.id===goal.cat)||CATS[0]
              return(
                <div key={goal.id} className="goal-row brow" onClick={()=>toggleGoal(goal.id)} style={{display:'flex',alignItems:'flex-start',gap:14,background:goal.done?'#eef5ee':C.surface,border:`1px solid ${goal.done?'#b8d4b5':C.border}`,borderRadius:8,padding:'13px 16px',cursor:'pointer',position:'relative'}}>
                  <div style={{marginTop:2,width:18,height:18,borderRadius:'50%',flexShrink:0,border:`1.5px solid ${goal.done?'#2d5a28':C.border}`,background:goal.done?'#2d5a28':'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
                    {goal.done&&<span style={{color:'white',fontSize:'0.58rem',fontWeight:800}}>✓</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2,flexWrap:'wrap'}}>
                      <div style={{fontWeight:600,fontSize:'0.88rem',color:goal.done?C.muted:C.text,textDecoration:goal.done?'line-through':'none'}}>{goal.title}</div>
                      <span style={{fontSize:'0.58rem',fontFamily:"'DM Mono',monospace",padding:'1px 7px',borderRadius:10,background:cat.color+'18',color:cat.color,border:`1px solid ${cat.color}33`,letterSpacing:'0.04em',textTransform:'uppercase'}}>{cat.label}</span>
                    </div>
                    {goal.deadline&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.58rem',color:C.muted,marginBottom:goal.note?4:0}}>Target: {goal.deadline}</div>}
                    {goal.note&&<div style={{fontSize:'0.76rem',color:C.muted,lineHeight:1.45}}>{goal.note}</div>}
                  </div>
                  <button className="del-btn" onClick={e=>{e.stopPropagation();deleteGoal(goal.id)}} style={{opacity:0,background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'0.85rem',padding:'0 4px',flexShrink:0,transition:'opacity 0.15s'}}>✕</button>
                </div>
              )
            })}
          </div>

          {!addingGoal?(
            <AddBtn onClick={()=>setAddingGoal(true)}>+ Add Goal</AddBtn>
          ):(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'20px'}}>
              <SectionLabel>New Goal</SectionLabel>
              <input value={newGoal.title} onChange={e=>setNewGoal(p=>({...p,title:e.target.value}))} placeholder="Goal title..." style={{width:'100%',...InputStyle,marginBottom:10}}/>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <select value={newGoal.cat} onChange={e=>setNewGoal(p=>({...p,cat:e.target.value}))} style={{flex:1,...InputStyle}}>
                  {CATS.map(cc=><option key={cc.id} value={cc.id}>{cc.label}</option>)}
                </select>
                <input value={newGoal.deadline} onChange={e=>setNewGoal(p=>({...p,deadline:e.target.value}))} placeholder="Target (e.g. Aug 5)" style={{flex:1,...InputStyle}}/>
              </div>
              <input value={newGoal.note} onChange={e=>setNewGoal(p=>({...p,note:e.target.value}))} placeholder="Notes or progression plan (optional)..." style={{width:'100%',...InputStyle,marginBottom:14}}/>
              <div style={{display:'flex',gap:8}}>
                <SaveBtn onClick={saveGoal}/>
                <CancelBtn onClick={()=>setAddingGoal(false)}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WEEKLY ── */}
      {!loading&&tab==='weekly'&&(
        <div style={{padding:'32px 48px',maxWidth:900,margin:'0 auto'}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.4rem',color:C.text,marginBottom:4}}>Weekly Review</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.6rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:28}}>Last 7 days</div>

          <AICard text={weeklyReview} loading={reviewLoading} onGenerate={generateWeeklyReview} label="AI Weekly Summary" icon="◈"/>

          {/* Stats grid */}
          {(()=>{
            const last7=getLast7Keys()
            let sessionsDone=0,totalPossible=0
            last7.forEach(k=>{const plan=getDayPlan(new Date(k));if(plan.isActive){totalPossible+=plan.blocks.length;sessionsDone+=plan.blocks.filter(b=>(checkins[k]||{})[b.id]).length}})
            const pct7=totalPossible>0?Math.round((sessionsDone/totalPossible)*100):0
            const foodCount=last7.reduce((a,k)=>a+(foodLog[k]||[]).length,0)
            const workoutCount=last7.reduce((a,k)=>a+(workoutLog[k]||[]).length,0)
            const skillCount=practiceEntries.filter(e=>last7.includes(e.date_key)).length
            const noteCount=last7.reduce((a,k)=>a+(notes[k]||[]).length,0)
            const stats=[
              {val:`${pct7}%`,  label:'Training\nCompletion'},
              {val:sessionsDone,label:'Sessions\nCompleted'},
              {val:foodCount,   label:'Meals\nLogged'},
              {val:skillCount,  label:'Practice\nEntries'},
              {val:workoutCount,label:'Extra\nWorkouts'},
              {val:noteCount,   label:'Coach\nNotes'},
            ]
            return(
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:28}}>
                {stats.map(s=>(
                  <div key={s.label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'16px',textAlign:'center'}}>
                    <div style={{fontFamily:"'DM Serif Display',serif",fontSize:'1.8rem',color:C.text,lineHeight:1}}>{s.val}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.56rem',color:C.muted,textTransform:'uppercase',letterSpacing:'0.05em',marginTop:4,whiteSpace:'pre-line'}}>{s.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Recent notes this week */}
          {(()=>{
            const last7=getLast7Keys()
            const weekNotes=last7.flatMap(k=>(notes[k]||[]).map(n=>({...n,date:k})))
            if(!weekNotes.length) return null
            return(
              <div>
                <SectionLabel>Notes This Week</SectionLabel>
                {weekNotes.map((n,i)=>(
                  <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:'10px 14px',marginBottom:6}}>
                    <div style={{fontSize:'0.82rem',color:C.text,lineHeight:1.5}}>{n.text}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'0.56rem',color:C.muted,marginTop:4}}>{n.date} · {n.ts}</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
