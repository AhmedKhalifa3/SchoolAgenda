import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignupPage() {
  const [grades, setGrades] = useState([])
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'student', gradeId: '', useSharedKey: false, sharedKey: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  useEffect(() => { supabase.from('grades').select('*').order('name').then(({ data }) => data && setGrades(data)) }, [])
  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }
  function toggle(field) { return () => setForm(f => ({ ...f, [field]: !f[field] })) }
  const needsGrade = ['student'].includes(form.role)
  const isParent = form.role === 'parent'
  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (needsGrade && !form.gradeId) { setError('Please select a grade.'); return }
    if (isParent && form.useSharedKey && !form.sharedKey) { setError('Please enter a shared key.'); return }
    setLoading(true)
    const { error: signupError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName, role: form.role, grade_id: needsGrade ? parseInt(form.gradeId) : null, shared_key: (isParent && form.useSharedKey) ? form.sharedKey.trim().toUpperCase() : null } } })
    if (signupError) { setError(signupError.message); setLoading(false); return }
    setLoading(false); setDone(true)
  }
  if (done) return <div style={styles.page}><div style={styles.box}><h2 style={{ fontSize: 18, marginBottom: 8 }}>Check your email ✉️</h2><p style={{ color: 'var(--text2)', fontSize: 13 }}>We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account, then <Link to="/login">sign in</Link>.</p></div></div>
  return <div style={styles.page}><div style={styles.box}><h1 style={styles.title}>📅 SchoolAgenda</h1><p style={styles.sub}>Create an account</p>{error && <div className="error-msg">{error}</div>}<form onSubmit={handleSubmit}><div className="form-field"><label>Full name</label><input value={form.fullName} onChange={set('fullName')} required autoFocus /></div><div className="form-field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} required /></div><div className="form-field"><label>Password</label><input type="password" value={form.password} onChange={set('password')} minLength={6} required /></div><div className="form-row"><div className="form-field"><label>Role</label><select value={form.role} onChange={set('role')}><option value="student">Student</option><option value="parent">Parent</option><option value="teacher">Teacher</option></select></div>{needsGrade && <div className="form-field"><label>Grade</label><select value={form.gradeId} onChange={set('gradeId')} required><option value="">Select…</option>{grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>}</div>{isParent && <div style={styles.parentSection}><div style={styles.toggleRow}><input type="checkbox" id="useSharedKey" checked={form.useSharedKey} onChange={toggle('useSharedKey')} style={{ cursor: 'pointer' }} /><label htmlFor="useSharedKey" style={{ cursor: 'pointer', flex: 1 }}>I have a shared key from my child</label></div>{form.useSharedKey && <div className="form-field" style={{ marginTop: 10 }}><label>Shared key (from your child's account)</label><input type="text" placeholder="e.g., ABC12345" value={form.sharedKey} onChange={set('sharedKey')} required={form.useSharedKey} style={{ textTransform: 'uppercase', letterSpacing: 2 }} /><p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>ℹ️ Your child can generate this key in their account settings. It expires after 30 minutes.</p></div>}{!form.useSharedKey && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>ℹ️ You can add children later by entering their shared keys in your account settings.</p>}</div>}{form.role === 'teacher' && <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>ℹ️ After signing up, an admin will assign you to your subjects.</p>}<button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>{loading ? <><span className="spinner" /> Creating account…</> : 'Create account'}</button></form><p style={styles.footer}>Already have an account? <Link to="/login">Sign in</Link></p></div></div>
}
const styles = { page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }, box: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow)' }, title: { fontSize: 22, fontWeight: 600, marginBottom: 4 }, sub: { color: 'var(--text2)', fontSize: 13, marginBottom: 24 }, footer: { marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text2)' }, parentSection: { background: 'var(--bg)', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid var(--border)' }, toggleRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 } }
