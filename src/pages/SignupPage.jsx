import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignupPage() {
  const [grades, setGrades] = useState([])
  const [form, setForm] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    role: 'student', 
    gradeId: '',
    useSharedKey: false,
    sharedKey: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('grades').select('*').order('name').then(({ data }) => data && setGrades(data))
  }, [])

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }
  function toggle(field) { return () => setForm(f => ({ ...f, [field]: !f[field] })) }

  const needsGrade = ['student'].includes(form.role)
  const isParent = form.role === 'parent'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (needsGrade && !form.gradeId) { 
      setError('Please select a grade.')
      return 
    }
    if (isParent && form.useSharedKey && !form.sharedKey) {
      setError('Please enter a shared key.')
      return
    }

    setLoading(true)

    const { error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { 
        data: { 
          full_name: form.fullName, 
          role: form.role, 
          grade_id: needsGrade ? parseInt(form.gradeId) : null,
          shared_key: (isParent && form.useSharedKey) ? form.sharedKey.trim().toUpperCase() : null,
        } 
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setDone(true)
  }

  if (done) return (
    <div style={styles.page}>
      <div style={styles.right}>
        <div style={styles.box}>
          <div style={styles.successIcon}>✉️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
          <p style={{ color:'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
            We sent a confirmation link to <strong>{form.email}</strong>.<br/>Click it to activate your account, then <Link to="/login">sign in</Link>.
          </p>
        </div>
      </div>
    </div>
  )

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
            Join your school's assessment platform. Stay organized and never miss an important date.
          </p>
        </div>
      </div>
      <div style={styles.right}>
        <div style={styles.box}>
          <h2 style={styles.title}>Create your account</h2>
          <p style={styles.sub}>Get started in under a minute</p>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Full name</label>
              <input value={form.fullName} onChange={set('fullName')} required autoFocus placeholder="Jane Smith" />
            </div>
            <div className="form-field">
              <label>Email address</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="you@school.edu" />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={set('password')} minLength={6} required placeholder="Min. 6 characters" />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Role</label>
                <select value={form.role} onChange={set('role')}>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              {needsGrade && (
                <div className="form-field">
                  <label>Grade</label>
                  <select value={form.gradeId} onChange={set('gradeId')} required>
                    <option value="">Select…</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {isParent && (
              <div style={styles.parentSection}>
                <div style={styles.toggleRow}>
                  <input 
                    type="checkbox" 
                    id="useSharedKey" 
                    checked={form.useSharedKey} 
                    onChange={toggle('useSharedKey')}
                    style={{ cursor: 'pointer', accentColor: 'var(--blue)' }}
                  />
                  <label htmlFor="useSharedKey" style={{ cursor: 'pointer', flex: 1, fontSize: 13 }}>
                    I have a shared key from my child
                  </label>
                </div>
                {form.useSharedKey && (
                  <div className="form-field" style={{ marginTop: 12 }}>
                    <label>Shared key</label>
                    <input 
                      type="text" 
                      placeholder="e.g., ABC12345" 
                      value={form.sharedKey} 
                      onChange={set('sharedKey')}
                      required={form.useSharedKey}
                      style={{ textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'monospace' }}
                    />
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                      Your child generates this in their Settings → Parent Invitation Keys.
                    </p>
                  </div>
                )}
                {!form.useSharedKey && (
                  <p style={{ fontSize: 12, color:'var(--text3)', marginTop: 8 }}>
                    You can link to your child later in Settings.
                  </p>
                )}
              </div>
            )}

            {form.role === 'teacher' && (
              <div style={styles.infoBox}>
                <i className="ti ti-info-circle" style={{ color: 'var(--blue)', flexShrink: 0 }} />
                <span>After signing up, an admin will assign you to your subjects.</span>
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', padding: '10px 16px', fontSize: 14 }}>
              {loading ? <><span className="spinner" /> Creating account…</> : 'Create account'}
            </button>
          </form>
          <p style={styles.footer}>Already have an account? <Link to="/login">Sign in</Link></p>
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
  leftSub: { fontSize: 15, color: '#94a3b8', lineHeight: 1.6 },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    background: 'var(--bg)',
    overflowY: 'auto',
  },
  box: { width:'100%', maxWidth: 420 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' },
  sub: { color:'var(--text2)', fontSize: 14, marginBottom: 28 },
  footer: { marginTop: 20, textAlign:'center', fontSize: 13, color:'var(--text2)' },
  parentSection: { background:'var(--bg3)', borderRadius: 10, padding: 14, marginBottom: 16, border:'1px solid var(--border)' },
  toggleRow: { display:'flex', alignItems:'center', gap: 8 },
  infoBox: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)', background: 'var(--blue-light)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 },
  successIcon: { fontSize: 40, marginBottom: 12 },
}
