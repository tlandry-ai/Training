import { useState } from 'react'
import { useRouter } from 'next/router'

const icons = ['☀️','🌊','🌸','⭐','🍉','🌺','✨','🏆','🎀','🌴','🦋','🌻']

export default function Login() {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) { router.push('/') }
    else { setError(true); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #FFF9E6 0%, #FFE8D6 35%, #FFD6E8 70%, #E8F0FF 100%)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative', fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        input:focus { outline:none; }

        .float-icon {
          position:absolute;
          font-size:1.8rem;
          animation: floatAround 6s ease-in-out infinite;
          pointer-events:none;
          user-select:none;
          opacity:0.7;
        }
        @keyframes floatAround {
          0%   { transform: translateY(0px) rotate(0deg); }
          33%  { transform: translateY(-12px) rotate(8deg); }
          66%  { transform: translateY(6px) rotate(-5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes popIn {
          0%   { transform: scale(0.7) translateY(30px); opacity:0; }
          100% { transform: scale(1) translateY(0); opacity:1; }
        }
        @keyframes shimmer {
          0%,100% { text-shadow: 2px 2px 0px #f9a8d4, 4px 4px 0px #fde68a; }
          50%      { text-shadow: 2px 2px 0px #fde68a, 4px 4px 0px #a5f3fc; }
        }
        .title { animation: shimmer 3s ease-in-out infinite; }
        .card  { animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .enter-btn:hover { transform: scale(1.04); }
        .enter-btn:active { transform: scale(0.97); }
        .enter-btn { transition: transform 0.15s; }
        input::placeholder { color: #c4a882; }
      `}</style>

      {/* Floating icons */}
      {[
        {icon:'☀️', top:'8%',  left:'8%',  delay:'0s',   size:'2.4rem'},
        {icon:'🌊', top:'15%', right:'10%',delay:'0.8s', size:'2rem'  },
        {icon:'🌸', top:'75%', left:'6%',  delay:'1.2s', size:'1.9rem'},
        {icon:'⭐', top:'82%', right:'8%', delay:'0.4s', size:'1.8rem'},
        {icon:'🍉', top:'5%',  right:'25%',delay:'1.6s', size:'2.2rem'},
        {icon:'🌺', top:'88%', left:'30%', delay:'2s',   size:'1.7rem'},
        {icon:'✨', top:'45%', left:'4%',  delay:'0.6s', size:'1.6rem'},
        {icon:'🌴', top:'60%', right:'5%', delay:'1.4s', size:'2rem'  },
        {icon:'🦋', top:'30%', left:'12%', delay:'1.8s', size:'1.7rem'},
        {icon:'🌻', top:'20%', right:'30%',delay:'2.2s', size:'1.8rem'},
        {icon:'🎀', top:'70%', right:'20%',delay:'0.2s', size:'1.6rem'},
        {icon:'🏆', top:'50%', right:'12%',delay:'1.0s', size:'1.9rem'},
      ].map((f, i) => (
        <span key={i} className="float-icon" style={{
          top:f.top, left:f.left, right:f.right, fontSize:f.size,
          animationDelay:f.delay, animationDuration:`${5+i*0.4}s`,
        }}>{f.icon}</span>
      ))}

      {/* Card */}
      <div className="card" style={{ width:360, textAlign:'center', position:'relative', zIndex:10 }}>

        {/* Sun burst behind title */}
        <div style={{ position:'relative', marginBottom:8 }}>
          <div style={{ fontSize:'3.5rem', marginBottom:0, filter:'drop-shadow(0 4px 12px rgba(251,191,36,0.5))' }}>☀️</div>
        </div>

        <h1 className="title" style={{
          fontFamily:'Pacifico, cursive', fontSize:'2.1rem',
          color:'#d97706', lineHeight:1.15, marginBottom:6,
          textShadow:'2px 2px 0px #f9a8d4, 4px 4px 0px #fde68a',
        }}>
          Temple's<br/>Summer Plan
        </h1>

        <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', color:'#c4a882', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:32 }}>
          ✦ private ✦
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="password 🔑"
            autoFocus
            style={{
              width:'100%',
              background:'rgba(255,255,255,0.75)',
              backdropFilter:'blur(8px)',
              border:`2px solid ${error ? '#f87171' : 'rgba(217,119,6,0.25)'}`,
              borderRadius:16, padding:'14px 20px',
              color:'#78350f', fontSize:'1rem',
              fontFamily:"'DM Sans', sans-serif",
              marginBottom:10, textAlign:'center',
              boxShadow:'0 4px 20px rgba(217,119,6,0.1)',
            }}
          />
          {error && (
            <div style={{ fontFamily:"'DM Mono', monospace", fontSize:'0.65rem', color:'#ef4444', marginBottom:10 }}>
              wrong password 🙈
            </div>
          )}
          <button type="submit" disabled={loading} className="enter-btn" style={{
            width:'100%',
            background:'linear-gradient(135deg, #f59e0b, #ef4444)',
            border:'none', borderRadius:16, padding:'15px',
            color:'white', fontFamily:'Pacifico, cursive',
            fontSize:'1.1rem', cursor:'pointer',
            boxShadow:'0 6px 24px rgba(245,158,11,0.4)',
          }}>
            {loading ? '✨ entering...' : "let's go! 🚀"}
          </button>
        </form>

        <div style={{ marginTop:20, fontSize:'1.4rem', letterSpacing:'8px' }}>🌸 ☀️ 🌊</div>
      </div>
    </div>
  )
}
