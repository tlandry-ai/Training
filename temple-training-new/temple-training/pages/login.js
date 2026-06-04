import { useState } from 'react'
import { useRouter } from 'next/router'

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
    if (res.ok) {
      router.push('/')
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#0d0d0d', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } input:focus { outline: none; }`}</style>
      <div style={{ width: '320px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: '2.2rem', letterSpacing: '0.14em', color: '#E8322A', marginBottom: '4px' }}>
          ARENA TRAINING
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.62rem', color: '#555', letterSpacing: '0.08em', marginBottom: '40px' }}>
          TEMPLE LANDRY · PRIVATE
        </div>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%', background: '#161616', border: `1px solid ${error ? '#7a1a1a' : '#222'}`,
              borderRadius: '8px', padding: '14px 16px', color: '#F5F0E8',
              fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px',
            }}
          />
          {error && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.65rem', color: '#E8322A', marginBottom: '12px' }}>
              wrong password
            </div>
          )}
          <button type="submit" disabled={loading} style={{
            width: '100%', background: '#E8322A', border: 'none', borderRadius: '8px',
            padding: '14px', color: 'white', fontFamily: 'Bebas Neue',
            fontSize: '1rem', letterSpacing: '0.1em', cursor: 'pointer',
          }}>
            {loading ? 'ENTERING...' : 'ENTER'}
          </button>
        </form>
      </div>
    </div>
  )
}
