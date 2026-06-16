import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [grades,   setGrades]   = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [parentStudentConnections, setParentStudentConnections] = useState([])
  const [sharedKeys, setSharedKeys] = useState([])
  const [loading, setLoading]   = useState(true)

  // Add-grade form
  const [newGradeName, setNewGradeName] = useState('')
  const [newGradeYear, setNewGradeYear] = useState(new Date().getFullYear())

  // Add-subject form
  const [newSubjectName,    setNewSubjectName]    = useState('')
  const [newSubjectGradeId, setNewSubjectGradeId] = useState('')

  // Assign teacher form
  const [assignTeacherId,  setAssignTeacherId]  = useState('')
  const [assignSubjectId,  setAssignSubjectId]  = useState('')

  // Parent-student link form
  const [linkParentId,  setLinkParentId]  = useState('')
  const [linkStudentId, setLinkStudentId] = useState('')

  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [g, s, p, ts, st, pr, psc, sk] = await Promise.all([
      supabase.from('grades').select('*').order('name'),
      supabase.from('subjects').select('*, grades(name)').order('name'),
      supabase.from('profiles').select('*').eq('role','teacher').order('full_name'),
      supabase.from('teacher_subjects').select('*, profiles(full_name), subjects(name, grades(name))'),
      supabase.from('profiles').select('*').eq('role','student').order('full_name'),
      supabase.from('profiles').select('*').eq('role','parent').order('full_name'),
      supabase.from('parent_student_connections').select('*, parent:parent_id(full_name), student:student_id(full_name, grades(name))').order('created_at'),
      supabase.from('shared_keys').select('*, student:student_id(full_name), user:used_by(full_name)').order('created_at', { ascending: false }).limit(50),
    ])
    if (g.data)  setGrades(g.data)
    if (s.data)  setSubjects(s.data)
    if (p.data)  setTeachers(p.data)
    if (ts.data) setAssignments(ts.data)
    if (st.data) setStudents(st.data)
    if (pr.data) setParents(pr.data)
    if (psc.data) setParentStudentConnections(psc.data)
    if (sk.data) setSharedKeys(sk.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  async function addGrade(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('grades').insert({ name: newGradeName, year: parseInt(newGradeYear) })
    if (error) { setError(error.message); return }
    setNewGradeName('')
    flash('Grade added.')
    load()
  }

  async function deleteGrade(id) {
    if (!confirm('Delete this grade and all its subjects and events?')) return
    await supabase.from('grades').delete().eq('id', id)
    load()
  }

  async function addSubject(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('subjects').insert({ name: newSubjectName, grade_id: parseInt(newSubjectGradeId) })
    if (error) { setError(error.message); return }
    setNewSubjectName('')
    flash('Subject added.')
    load()
  }

  async function deleteSubject(id) {
    if (!confirm('Delete this subject and its events?')) return
    await supabase.from('subjects').delete().eq('id', id)
    load()
  }

  async function assignTeacher(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('teacher_subjects').insert({
      teacher_id: assignTeacherId,
      subject_id: parseInt(assignSubjectId),
    })
    if (error) { setError(error.message); return }
    flash('Teacher assigned.')
    load()
  }

  async function removeAssignment(id) {
    await supabase.from('teacher_subjects').delete().eq('id', id)
    load()
  }

  async function linkParentToStudent(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('parent_student_connections').insert({
      parent_id: linkParentId,
      student_id: linkStudentId,
    })
    if (error) { setError(error.message); return }
    setLinkParentId('')
    setLinkStudentId('')
    flash('Parent linked to student.')
    load()
  }

  async function removeParentStudentLink(id) {
    await supabase.from('parent_student_connections').delete().eq('id', id)
    load()
  }

  async function promoteToAdmin(userId) {
    if (!confirm('Make this user an admin?')) return
    await supabase.from('profiles').update({ role:'admin' }).eq('id', userId)
    load()
  }

  function isKeyExpired(expiresAt) {
    return new Date(expiresAt) < new Date()
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString()
  }

  if (loading) return <div style={{ textAlign:'center', padding:60 }}><div className="spinner" /></div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>School Setup</h1>
        <p style={{ fontSize: 13, color:'var(--text3)' }}>Manage grades, subjects, teacher assignments, and parent-child relationships.</p>
      </div>

      {error   && <div className="error-msg">{error}</div>}
      {success && <div style={{ background:'var(--green-light)', color:'var(--green-text)', borderRadius: 10, padding:'10px 14px', fontSize:13, marginBottom:14, fontWeight: 500, border: '1px solid var(--green)' }}>{success}</div>}

      <div style={styles.grid}>
        {/* Grades */}
        <div className="card">
          <div className="section-label">Grades</div>
          <form onSubmit={addGrade} style={styles.inlineForm}>
            <input style={styles.inlineInput} placeholder="Grade name, e.g. 9A" value={newGradeName} onChange={e=>setNewGradeName(e.target.value)} required />
            <input style={{...styles.inlineInput, width:70}} type="number" placeholder="Year" value={newGradeYear} onChange={e=>setNewGradeYear(e.target.value)} required />
            <button className="btn btn-primary btn-sm" type="submit"><i className="ti ti-plus" aria-hidden="true"/></button>
          </form>
          {grades.map(g => (
            <div key={g.id} style={styles.listRow}>
              <span style={{ fontSize:13 }}>{g.name} <span style={{ color:'var(--text3)', fontSize:11 }}>({g.year})</span></span>
              <button className="btn btn-sm" onClick={() => deleteGrade(g.id)} style={{ color:'var(--red-text)' }}>
                <i className="ti ti-trash" aria-hidden="true"/>
              </button>
            </div>
          ))}
          {grades.length === 0 && <div className="empty-state" style={{ padding:'16px 0' }}>No grades yet.</div>}
        </div>

        {/* Subjects */}
        <div className="card">
          <div className="section-label">Subjects</div>
          <form onSubmit={addSubject} style={styles.inlineForm}>
            <input style={styles.inlineInput} placeholder="Subject name" value={newSubjectName} onChange={e=>setNewSubjectName(e.target.value)} required />
            <select style={{...styles.inlineInput, width:100}} value={newSubjectGradeId} onChange={e=>setNewSubjectGradeId(e.target.value)} required>
              <option value="">Grade…</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" type="submit"><i className="ti ti-plus" aria-hidden="true"/></button>
          </form>
          {subjects.map(s => (
            <div key={s.id} style={styles.listRow}>
              <div>
                <span style={{ fontSize:13 }}>{s.name}</span>
                <span style={{ fontSize:11, color:'var(--text3)', marginLeft:6 }}>{s.grades?.name}</span>
              </div>
              <button className="btn btn-sm" onClick={() => deleteSubject(s.id)} style={{ color:'var(--red-text)' }}>
                <i className="ti ti-trash" aria-hidden="true"/>
              </button>
            </div>
          ))}
          {subjects.length === 0 && <div className="empty-state" style={{ padding:'16px 0' }}>No subjects yet.</div>}
        </div>

        {/* Teacher assignments */}
        <div className="card" style={{ gridColumn:'1 / -1' }}>
          <div className="section-label">Teacher ↔ Subject assignments</div>
          <form onSubmit={assignTeacher} style={styles.inlineForm}>
            <select style={styles.inlineInput} value={assignTeacherId} onChange={e=>setAssignTeacherId(e.target.value)} required>
              <option value="">Select teacher…</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
            <select style={styles.inlineInput} value={assignSubjectId} onChange={e=>setAssignSubjectId(e.target.value)} required>
              <option value="">Select subject…</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} — {s.grades?.name}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" type="submit">Assign</button>
          </form>

          {teachers.length === 0 && (
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>No teachers registered yet. Teachers sign up on the signup page.</p>
          )}

          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
            {assignments.map(a => (
              <div key={a.id} style={styles.assignChip}>
                <strong>{a.profiles?.full_name}</strong>
                <span style={{ color:'var(--text2)' }}>→ {a.subjects?.name} ({a.subjects?.grades?.name})</span>
                <button onClick={() => removeAssignment(a.id)} style={{ border:'none', background:'none', color:'var(--text3)', cursor:'pointer', padding:'0 2px', fontSize:13 }} aria-label="Remove">×</button>
              </div>
            ))}
            {assignments.length === 0 && <span style={{ fontSize:13, color:'var(--text3)' }}>No assignments yet.</span>}
          </div>
        </div>

        {/* Parent ↔ Student Links */}
        <div className="card" style={{ gridColumn:'1 / -1' }}>
          <div className="section-label">Parent ↔ Student links</div>
          <form onSubmit={linkParentToStudent} style={styles.inlineForm}>
            <select style={styles.inlineInput} value={linkParentId} onChange={e=>setLinkParentId(e.target.value)} required>
              <option value="">Select parent…</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <select style={styles.inlineInput} value={linkStudentId} onChange={e=>setLinkStudentId(e.target.value)} required>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" type="submit">Link</button>
          </form>

          {parents.length === 0 && (
            <p style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>No parents registered yet.</p>
          )}

          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
            {parentStudentConnections.map(psc => (
              <div key={psc.id} style={styles.assignChip}>
                <strong>{psc.parent?.full_name}</strong>
                <span style={{ color:'var(--text2)' }}>→ {psc.student?.full_name} ({psc.student?.grades?.name})</span>
                <button onClick={() => removeParentStudentLink(psc.id)} style={{ border:'none', background:'none', color:'var(--text3)', cursor:'pointer', padding:'0 2px', fontSize:13 }} aria-label="Remove">×</button>
              </div>
            ))}
            {parentStudentConnections.length === 0 && <span style={{ fontSize:13, color:'var(--text3)' }}>No parent-student links yet.</span>}
          </div>
        </div>

        {/* Shared Keys Overview */}
        <div className="card" style={{ gridColumn:'1 / -1' }}>
          <div className="section-label">Student Shared Keys (for parent signup)</div>
          <p style={{ fontSize:12, color:'var(--text2)', marginBottom:12 }}>Keys that students have generated for parents to use during signup.</p>
          
          {sharedKeys.length === 0 ? (
            <div className="empty-state" style={{ padding:'12px 0' }}>No shared keys generated yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Key</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Expires At</th>
                    <th style={styles.th}>Used By</th>
                    <th style={styles.th}>Used At</th>
                  </tr>
                </thead>
                <tbody>
                  {sharedKeys.map(sk => {
                    const expired = isKeyExpired(sk.expires_at)
                    const used = !!sk.used_by
                    let status = 'Active'
                    if (used) status = 'Used'
                    else if (expired) status = 'Expired'
                    
                    return (
                      <tr key={sk.id}>
                        <td style={styles.td}>{sk.student?.full_name || 'Unknown'}</td>
                        <td style={{...styles.td, fontFamily: 'monospace', fontWeight: 600}}>{sk.key}</td>
                        <td style={{...styles.td, fontSize: 12}}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: used ? 'var(--blue-light)' : expired ? 'var(--red-light)' : 'var(--green-light)',
                            color: used ? 'var(--blue-text)' : expired ? 'var(--red-text)' : 'var(--green-text)',
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={styles.td}>{formatDate(sk.expires_at)}</td>
                        <td style={styles.td}>{sk.user?.full_name || '-'}</td>
                        <td style={styles.td}>{sk.used_at ? formatDate(sk.used_at) : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* All teachers */}
        <div className="card" style={{ gridColumn:'1 / -1' }}>
          <div className="section-label">Registered teachers</div>
          {teachers.length === 0
            ? <div className="empty-state" style={{ padding:'12px 0' }}>No teachers have signed up yet.</div>
            : teachers.map(t => (
                <div key={t.id} style={styles.listRow}>
                  <div>
                    <span style={{ fontSize:13 }}>{t.full_name}</span>
                    <span style={{ fontSize:11, color:'var(--text3)', marginLeft:6 }}>{t.id}</span>
                  </div>
                  <button className="btn btn-sm" onClick={() => promoteToAdmin(t.id)}>Make admin</button>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}

const styles = {
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 },
  inlineForm: { display:'flex', gap: 8, marginBottom: 12, flexWrap:'wrap' },
  inlineInput: { flex:1, minWidth:100, padding:'8px 10px', borderRadius: 8, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize: 13 },
  listRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', gap: 8 },
  assignChip: { display:'flex', alignItems:'center', gap: 6, background:'var(--bg3)', borderRadius: 8, padding:'6px 12px', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '2px solid var(--border)', fontWeight: 600, fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
}
