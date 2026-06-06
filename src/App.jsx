import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardLayout from './pages/DashboardLayout'
import CalendarPage from './pages/CalendarPage'
import UpcomingPage from './pages/UpcomingPage'
import AdminPage from './pages/AdminPage'
import DiagnosticPage from './pages/DiagnosticPage'

function RequireAuth({ children }) {
  const { session, profile, profileError, loading } = useAuth()

  if (loading) return <Centered><div className="spinner" /></Centered>
  if (!session) return <Navigate to="/login" replace />
  if (profileError === 'no_profile') return <MissingProfileScreen />
  if (profileError) return (
    <Centered>
      <div style={{ maxWidth:420, textAlign:'center', padding:24 }}>
        <p style={{ fontWeight:500, marginBottom:8, fontSize:15 }}>Could not load your profile</p>
        <div className="error-msg" style={{ textAlign:'left' }}>{profileError}</div>
        <p style={{ fontSize:12, color:'var(--text2)', marginTop:12, marginBottom:16 }}>
          The diagnostic page will tell you exactly what's wrong and how to fix it.
        </p>
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          <a href="/diagnostic" className="btn btn-primary">Run diagnostic</a>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    </Centered>
  )
  if (!profile) return <Centered><div className="spinner" /></Centered>
  return children
}

function MissingProfileScreen() {
  const { session, createProfile, signOut } = useAuth()
  const [form, setForm] = useState({ fullName: session?.user?.email?.split('@')[0] || '', role: 'student' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await createProfile(session.user.id, form.fullName, form.role, null)
    if (error) { setError(error.message); setSaving(false) }
  }

  return (
    <Centered>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:28, maxWidth:400, width:'100%', margin:16 }}>
        <h2 style={{ fontSize:16, fontWeight:500, marginBottom:6 }}>Finish setting up your account</h2>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:18 }}>
          Your profile wasn't created automatically — this usually means the schema SQL was run after you first signed up. Fill in your details to continue.
        </p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Full name</label>
            <input value={form.fullName} onChange={e => setForm(f=>({...f,fullName:e.target.value}))} required />
          </div>
          <div className="form-field">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <p style={{ fontSize:11, color:'var(--text3)', marginBottom:12 }}>Admins can be set manually in Supabase SQL Editor.</p>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ width:'100%', justifyContent:'center' }}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Continue to dashboard'}
          </button>
        </form>
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <a href="/diagnostic" className="btn btn-sm" style={{ flex:1, justifyContent:'center' }}>Run diagnostic</a>
          <button className="btn btn-sm" style={{ flex:1, justifyContent:'center' }} onClick={() => signOut()}>Sign out</button>
        </div>
      </div>
    </Centered>
  )
}

function Centered({ children }) {
  return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>{children}</div>
}

function RoleRoute({ roles, children }) {
  const { profile } = useAuth()
  if (!profile) return <Centered><div className="spinner" /></Centered>
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/signup"     element={<SignupPage />} />
          <Route path="/diagnostic" element={<DiagnosticPage />} />
          <Route path="/" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
            <Route index element={<CalendarPage />} />
            <Route path="upcoming" element={<UpcomingPage />} />
            <Route path="admin" element={<RoleRoute roles={['admin']}><AdminPage /></RoleRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
