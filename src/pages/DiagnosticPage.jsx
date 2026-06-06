import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DiagnosticPage() {
  const [checks, setChecks] = useState([])
  const [running, setRunning] = useState(true)

  useEffect(() => { runChecks() }, [])

  async function runChecks() {
    const results = []

    // 1. Env vars
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    results.push({
      name: 'VITE_SUPABASE_URL loaded',
      ok: !!url && url !== 'https://your-project-id.supabase.co',
      detail: url ? url : 'MISSING — check your .env.local file',
    })
    results.push({
      name: 'VITE_SUPABASE_ANON_KEY loaded',
      ok: !!key && key !== 'your-anon-key-here',
      detail: key ? key.slice(0, 20) + '…' : 'MISSING — check your .env.local file',
    })

    // 2. Can reach Supabase at all
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      })
      results.push({ name: 'Supabase reachable', ok: res.ok, detail: `HTTP ${res.status}` })
    } catch (e) {
      results.push({ name: 'Supabase reachable', ok: false, detail: e.message })
    }

    // 3. Auth session
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
    results.push({
      name: 'Auth session',
      ok: !!session,
      detail: session ? `Logged in as ${session.user.email}` : (sessionErr?.message || 'No active session — please sign in'),
    })

    if (session) {
      // 4. profiles table exists
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      results.push({
        name: 'profiles table & row',
        ok: !!profile,
        detail: profile
          ? `Found: role=${profile.role}, grade_id=${profile.grade_id}`
          : `Error: ${profileErr?.message} (code: ${profileErr?.code})`,
      })

      // 5. grades table
      const { data: grades, error: gradesErr } = await supabase.from('grades').select('*')
      results.push({
        name: 'grades table',
        ok: !gradesErr,
        detail: gradesErr ? gradesErr.message : `${grades?.length} rows found`,
      })

      // 6. subjects table
      const { data: subjects, error: subjectsErr } = await supabase.from('subjects').select('*')
      results.push({
        name: 'subjects table',
        ok: !subjectsErr,
        detail: subjectsErr ? subjectsErr.message : `${subjects?.length} rows found`,
      })

      // 7. events table
      const { data: events, error: eventsErr } = await supabase.from('events').select('*')
      results.push({
        name: 'events table',
        ok: !eventsErr,
        detail: eventsErr ? eventsErr.message : `${events?.length} rows found`,
      })

      // 8. RLS — can user read their own profile?
      const { error: rlsErr } = await supabase
        .from('profiles').select('id').eq('id', session.user.id).single()
      results.push({
        name: 'RLS: can read own profile',
        ok: !rlsErr,
        detail: rlsErr ? `RLS blocking read: ${rlsErr.message}` : 'OK',
      })
    }

    setChecks(results)
    setRunning(false)
  }

  const allOk = checks.every(c => c.ok)
  const failed = checks.filter(c => !c.ok)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:24, fontFamily:'system-ui,sans-serif' }}>
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        <h1 style={{ fontSize:20, fontWeight:600, marginBottom:4 }}>🔍 SchoolAgenda — Diagnostic</h1>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom:24 }}>
          This page checks every layer of the connection. Share the results if you need help.
        </p>

        {running && (
          <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text2)', fontSize:13 }}>
            <div className="spinner" /> Running checks…
          </div>
        )}

        {checks.map((c, i) => (
          <div key={i} style={{
            background:'var(--bg2)', border:`1px solid ${c.ok ? 'var(--border)' : '#E24B4A'}`,
            borderRadius:8, padding:'10px 14px', marginBottom:6,
            display:'flex', alignItems:'flex-start', gap:10,
          }}>
            <span style={{ fontSize:16, lineHeight:1.4 }}>{c.ok ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>{c.name}</div>
              <div style={{ fontSize:12, color: c.ok ? 'var(--text2)' : '#E24B4A', marginTop:2 }}>{c.detail}</div>
            </div>
          </div>
        ))}

        {!running && failed.length > 0 && (
          <div style={{ background:'#FFF3CD', border:'1px solid #EF9F27', borderRadius:10, padding:16, marginTop:16 }}>
            <div style={{ fontWeight:600, marginBottom:10, color:'#633806' }}>How to fix</div>
            {failed.map((c, i) => (
              <div key={i} style={{ fontSize:13, marginBottom:10, color:'#412402' }}>
                <strong>❌ {c.name}</strong>
                <div style={{ marginTop:4 }}>{getFix(c)}</div>
              </div>
            ))}
          </div>
        )}

        {!running && allOk && (
          <div style={{ background:'var(--green-light)', border:'1px solid var(--green-text)', borderRadius:10, padding:16, marginTop:16, color:'var(--green-text)', fontSize:13 }}>
            ✅ Everything looks good! Go back to <a href="/">the dashboard</a>.
          </div>
        )}

        <button
          className="btn btn-sm"
          style={{ marginTop:16 }}
          onClick={() => { setChecks([]); setRunning(true); runChecks() }}
        >
          Re-run checks
        </button>

        <a href="/" style={{ marginLeft:10, fontSize:13 }}>← Back to app</a>
      </div>
    </div>
  )
}

function getFix(check) {
  if (check.name.includes('URL') || check.name.includes('KEY')) {
    return 'Open your .env.local file. Make sure it has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with real values (not the placeholder text). Then fully stop and restart npm run dev.'
  }
  if (check.name.includes('reachable')) {
    return 'Your Supabase URL may be wrong, or the project may be paused. Go to supabase.com, open your project, and check it\'s active. Copy the URL from Settings → API.'
  }
  if (check.name.includes('session')) {
    return 'You are not signed in. Go to /login and sign in. If you just signed up, check your email for a confirmation link (or disable email confirmation in Supabase → Authentication → Providers → Email).'
  }
  if (check.name.includes('profiles table')) {
    if (check.detail?.includes('PGRST116')) {
      return 'You are signed in but have no profile row. Run this in Supabase SQL Editor:\n\ninsert into public.profiles (id, full_name, role, grade_id)\nvalues (\'YOUR-UUID\', \'Your Name\', \'admin\', null)\non conflict (id) do update set role = \'admin\';\n\nReplace YOUR-UUID with your user UUID from Supabase → Authentication → Users.'
    }
    return 'The profiles table may not exist. Make sure you ran the full supabase_schema.sql in Supabase SQL Editor.'
  }
  if (check.name.includes('table')) {
    return 'This table does not exist or RLS is blocking access. Make sure you ran the full supabase_schema.sql in Supabase → SQL Editor → New query → paste all → Run.'
  }
  if (check.name.includes('RLS')) {
    return 'Row Level Security is blocking reads. Make sure you ran the full schema SQL which includes the RLS policies and the my_role() function.'
  }
  return 'Check the Supabase dashboard for more details.'
}
