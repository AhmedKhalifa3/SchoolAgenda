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
      <div style={styles.box}>
        <h1 style={styles.title}>📅 SchoolAgenda</h1>
        <p style={styles.sub}>Sign in to your account</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
            {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
          </button>
        </form>
        <p style={styles.footer}>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  box: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:32, width:'100%', maxWidth:380, boxShadow:'var(--shadow)' },
  title: { fontSize:22, fontWeight:600, marginBottom:4 },
  sub: { color:'var(--text2)', fontSize:13, marginBottom:24 },
  footer: { marginTop:16, textAlign:'center', fontSize:13, color:'var(--text2)' },
}
