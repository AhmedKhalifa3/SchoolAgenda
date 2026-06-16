import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TYPE_DOT  = { Exam:'#dc2626', Quiz:'#ea580c', Test:'#7c3aed', Homework:'#16a34a', Presentation:'#0d9488' }

export default function UpcomingPage() {
  const { profile } = useAuth()
  const [events, setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]  = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('events')
        .select('*, subjects(name), profiles(full_name), grades(name)')
        .gte('date', today)
        .order('starts_at')
      if (!error && data) setEvents(data)
      setLoading(false)
    }
    load()
  }, [])

  function getConflictDays() {
    const highStakes = events.filter(e => ['Exam','Quiz','Test'].includes(e.type))
    const byDayGrade = {}
    highStakes.forEach(e => {
      const key = `${e.date}__${e.grade_id}`
      byDayGrade[key] = (byDayGrade[key] || 0) + 1
    })
    return new Set(
      Object.entries(byDayGrade)
        .filter(([,c]) => c > 1)
        .map(([k]) => k.split('__')[0])
    )
  }

  const conflictDays = getConflictDays()
  const filters = ['all','Exam','Quiz','Test','Homework','Presentation']
  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  function formatDate(ds) {
    const d = new Date(ds + 'T12:00:00')
    return d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })
  }

  function daysUntil(ds) {
    const diff = Math.round((new Date(ds+'T12:00:00') - new Date()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `${diff} days`
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Upcoming</h1>
          <p style={styles.subtitle}>{profile?.grades?.name || 'All grades'} — next assessments</p>
        </div>
      </div>

      {/* Filter pills */}
      <div style={styles.pills}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.pill,
              ...(filter === f ? styles.pillActive : {}),
              ...(filter === f && f !== 'all' ? { borderColor: TYPE_DOT[f], color: TYPE_DOT[f] } : {}),
            }}
          >
            {f !== 'all' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_DOT[f] }} />}
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <i className="ti ti-calendar-off" style={{ fontSize: 40, color: 'var(--text3)', display:'block', marginBottom: 12 }} />
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>No upcoming events</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((ev, i) => {
            const isConflict = conflictDays.has(ev.date)
            const prevDate = i > 0 ? filtered[i-1].date : null
            const showDate = ev.date !== prevDate

            return (
              <div key={ev.id}>
                {showDate && (
                  <div style={styles.dateLabel}>
                    <span>{formatDate(ev.date)}</span>
                    <span style={styles.daysLabel}>{daysUntil(ev.date)}</span>
                    {isConflict && <span style={styles.conflictTag}><i className="ti ti-alert-triangle" style={{ fontSize: 11 }} /> Conflict</span>}
                  </div>
                )}
                <div className="card" style={{
                  ...styles.eventCard,
                  borderLeftColor: TYPE_DOT[ev.type],
                  ...(isConflict ? { background: 'var(--amber-light)' } : {}),
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.evHeader}>
                      <span style={styles.evTitle}>{ev.title}</span>
                      <span className={`badge badge-${ev.type?.toLowerCase()}`}>{ev.type}</span>
                    </div>
                    <div style={styles.evMeta}>
                      <span><i className="ti ti-clock" style={{ fontSize: 12 }} /> {new Date(ev.starts_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}–{new Date(ev.ends_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                      <span><i className="ti ti-book" style={{ fontSize: 12 }} /> {ev.subjects?.name}</span>
                      <span><i className="ti ti-user" style={{ fontSize: 12 }} /> {ev.profiles?.full_name}</span>
                      {ev.grades?.name && <span><i className="ti ti-school" style={{ fontSize: 12 }} /> {ev.grades.name}</span>}
                    </div>
                    {ev.description && <p style={styles.desc}>{ev.description}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'var(--text3)' },
  pills: { display:'flex', gap: 6, flexWrap:'wrap', marginBottom: 20 },
  pill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding:'6px 14px', borderRadius: 20,
    border:'1.5px solid var(--border)', fontSize: 12,
    fontWeight: 500, cursor:'pointer', background: 'var(--bg2)', color: 'var(--text2)',
    transition:'all 0.15s',
  },
  pillActive: { background: 'var(--blue-light)', color: 'var(--blue)', borderColor: 'var(--blue)' },
  dateLabel: {
    display:'flex', alignItems:'center', gap: 10,
    fontSize: 13, fontWeight: 600, color:'var(--text)',
    marginTop: 20, marginBottom: 8, paddingLeft: 4,
  },
  daysLabel: { fontSize: 11, color: 'var(--text3)', fontWeight: 500 },
  conflictTag: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background:'var(--amber-light)', color:'var(--amber-text)',
    fontSize: 11, padding:'2px 8px', borderRadius: 10, fontWeight: 600,
  },
  eventCard: {
    padding: '14px 18px',
    borderLeft: '4px solid',
    borderRadius: 12,
    marginBottom: 0,
  },
  evHeader: { display:'flex', alignItems:'center', gap: 10, marginBottom: 6 },
  evTitle: { fontSize: 14, fontWeight: 600 },
  evMeta: { display:'flex', alignItems:'center', gap: 14, fontSize: 12, color:'var(--text2)', flexWrap:'wrap' },
  desc: { fontSize: 12, color:'var(--text2)', marginTop: 8, lineHeight: 1.5 },
}
