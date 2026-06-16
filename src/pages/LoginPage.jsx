import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#2563eb"/>
            <path d="M7 10h14M7 14h14M7 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="21" cy="18" r="3" fill="#60a5fa"/>
          </svg>
          <h1 style={styles.leftTitle}>SchoolAgenda</h1>
          <p style={styles.leftSub}>
            Keep parents informed, help teachers coordinate, and give students a clear view of what's ahead.
          </p>
          <div style={styles.features}>
            <div style={styles.feature}><i className="ti ti-calendar-event" style={{ color: '#60a5fa' }} /> Assessment calendar with conflict detection</div>
            <div style={styles.feature}><i className="ti ti-users" style={{ color: '#60a5fa' }} /> Role-based access for staff & families</div>
            <div style={styles.feature}><i className="ti ti-shield-check" style={{ color: '#60a5fa' }} /> Secure, real-time data sync</div>
          </div>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.box}>
          <h2 style={styles.title}>Welcome back</h2>
          <p style={styles.sub}>Sign in to your account to continue</p>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@school.edu" />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', padding: '10px 16px', fontSize: 14 }}>
              {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
            </button>
          </form>
          <p style={styles.footer}>
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight:'100vh', display:'flex' },
  left: {
    flex: 1,
    background: 'linear-gradient(135deg, #1a1d2e 0%, #1e3a5f 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  leftContent: { maxWidth: 400 },
  leftTitle: { fontSize: 28, fontWeight: 700, color: '#fff', marginTop: 16, marginBottom: 8, letterSpacing: '-0.02em' },
  leftSub: { fontSize: 15, color: '#94a3b8', lineHeight: 1.6, marginBottom: 32 },
  features: { display: 'flex', flexDirection: 'column', gap: 12 },
  feature: { display: 'flex', alignItems: 'center', gap: 10, color: '#c8cdd8', fontSize: 13 },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    background: 'var(--bg)',
  },
  box: { width:'100%', maxWidth: 380 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' },
  sub: { color:'var(--text2)', fontSize: 14, marginBottom: 28 },
  footer: { marginTop: 20, textAlign:'center', fontSize: 13, color:'var(--text2)' },
}
