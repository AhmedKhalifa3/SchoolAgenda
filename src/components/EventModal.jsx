import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const EVENT_TYPES = ['Exam', 'Quiz', 'Test', 'Homework', 'Presentation']

export default function EventModal({ event, onClose, onSaved }) {
  const { profile } = useAuth()
  const isEdit = !!event?.id

  const [mySubjects, setMySubjects] = useState([])
  const [form, setForm] = useState({
    title:      event?.title      || '',
    type:       event?.type       || 'Exam',
    date:       event?.date       || '',
    subject_id: event?.subject_id || '',
    description:event?.description|| '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load subjects this teacher is assigned to
    supabase
      .from('teacher_subjects')
      .select('subject_id, subjects(id, name, grade_id, grades(name))')
      .eq('teacher_id', profile.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setMySubjects(data.map(row => row.subjects))
        }
      })
  }, [profile.id])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.subject_id) { setError('Please select a subject.'); return }

    const subject = mySubjects.find(s => s.id === parseInt(form.subject_id))
    if (!subject) { setError('Invalid subject.'); return }

    setLoading(true)
    const payload = {
      title:       form.title,
      type:        form.type,
      date:        form.date,
      subject_id:  parseInt(form.subject_id),
      grade_id:    subject.grade_id,
      teacher_id:  profile.id,
      description: form.description || null,
    }

    let result
    if (isEdit) {
      result = await supabase.from('events').update(payload).eq('id', event.id)
    } else {
      result = await supabase.from('events').insert(payload)
    }

    setLoading(false)
    if (result.error) { setError(result.error.message); return }
    onSaved()
  }

  async function handleDelete() {
    if (!confirm('Delete this event?')) return
    await supabase.from('events').delete().eq('id', event.id)
    onSaved()
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>{isEdit ? 'Edit event' : 'Add event'}</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Title</label>
            <input value={form.title} onChange={set('title')} required placeholder="e.g. Chapter 5 exam" />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Type</label>
              <select value={form.type} onChange={set('type')}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={set('date')} required />
            </div>
          </div>

          <div className="form-field">
            <label>Subject</label>
            <select value={form.subject_id} onChange={set('subject_id')} required>
              <option value="">Select a subject…</option>
              {mySubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.grades?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Description (optional)</label>
            <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Chapters covered, what to bring…" style={{ resize:'vertical' }} />
          </div>

          <div style={styles.actions}>
            {isEdit && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
                <i className="ti ti-trash" aria-hidden="true" /> Delete
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? <span className="spinner" /> : (isEdit ? 'Save changes' : 'Add event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 16,
  },
  modal: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  title: { fontSize: 16, fontWeight: 500 },
  closeBtn: { background:'none', border:'none', color:'var(--text2)', fontSize:18, padding:2, lineHeight:1 },
  actions: { display:'flex', gap:8, alignItems:'center', marginTop:16 },
}
