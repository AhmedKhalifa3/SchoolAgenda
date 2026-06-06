import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const TYPE_BG   = { Exam:'var(--red-light)', Quiz:'var(--coral-light)', Test:'var(--purple-light)', Homework:'var(--green-light)', Presentation:'var(--teal-light)' }
const TYPE_TEXT = { Exam:'var(--red-text)', Quiz:'var(--coral-text)', Test:'var(--purple-text)', Homework:'var(--green-text)', Presentation:'var(--teal-text)' }
const TYPE_DOT  = { Exam:'#E24B4A', Quiz:'#D85A30', Test:'#7F77DD', Homework:'#639922', Presentation:'#1D9E75' }

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

  // Detect conflict days (2+ high-stakes same grade same day)
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
    const opts = { weekday:'short', day:'numeric', month:'short' }
    return d.toLocaleDateString('en-GB', opts)
  }

  function daysUntil(ds) {
    const diff = Math.round((new Date(ds+'T12:00:00') - new Date()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return `In ${diff} days`
  }

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:500, marginBottom:16 }}>
        Upcoming — {profile?.grades?.name || 'All grades'}
      </h2>

      {/* Filter pills */}
      <div style={styles.pills}>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.pill,
              background: filter===f ? (f==='all'?'var(--blue)':TYPE_BG[f]) : 'var(--bg2)',
              color:       filter===f ? (f==='all'?'#fff':TYPE_TEXT[f]) : 'var(--text2)',
              borderColor: filter===f ? 'transparent' : 'var(--border)',
            }}
          >
            {f === 'all' ? 'All types' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <i className="ti ti-calendar-off" style={{ fontSize:32, display:'block', marginBottom:8 }} aria-hidden="true" />
          No upcoming events.
        </div>
      ) : (
        <div>
          {filtered.map((ev, i) => {
            const isConflict = conflictDays.has(ev.date)
            const prevDate   = i > 0 ? filtered[i-1].date : null
            const showDate   = ev.date !== prevDate

            return (
              <div key={ev.id}>
                {showDate && (
                  <div style={styles.dateLabel}>
                    {formatDate(ev.date)}
                    {isConflict && <span style={styles.conflictTag}>⚠ conflict day</span>}
                  </div>
                )}
                <div
                  style={{
                    ...styles.card,
                    borderLeft: `3px solid ${TYPE_DOT[ev.type]}`,
                    background: isConflict ? 'var(--amber-light)' : 'var(--bg2)',
                  }}
                >
                  <div style={styles.dot} />
                  <div style={{ flex:1 }}>
                    <div style={styles.evTitle}>{ev.title}</div>
                    <div style={styles.evMeta}>
                      <span className={`badge badge-${ev.type?.toLowerCase()}`}>{ev.type}</span>
                      <span style={{ color:'var(--text3)' }}>·</span>
                      <span>{new Date(ev.starts_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}–{new Date(ev.ends_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                      <span style={{ color:'var(--text3)' }}>·</span>
                      {ev.subjects?.name}
                      <span style={{ color:'var(--text3)' }}>·</span>
                      {ev.profiles?.full_name}
                      {ev.grades?.name && (
                        <><span style={{ color:'var(--text3)' }}>·</span>{ev.grades.name}</>
                      )}
                    </div>
                    {ev.description && <div style={styles.desc}>{ev.description}</div>}
                  </div>
                  <div style={styles.days}>{daysUntil(ev.date)}</div>
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
  pills: { display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 },
  pill: {
    padding:'5px 12px', borderRadius:20,
    border:'1px solid var(--border)', fontSize:12,
    fontWeight:500, cursor:'pointer',
    transition:'all 0.12s',
  },
  dateLabel: {
    fontSize:11, fontWeight:600, color:'var(--text3)',
    textTransform:'uppercase', letterSpacing:'0.05em',
    marginTop:16, marginBottom:6,
    display:'flex', alignItems:'center', gap:8,
  },
  conflictTag: {
    background:'var(--amber-light)', color:'var(--amber-text)',
    fontSize:10, padding:'1px 7px', borderRadius:10, fontWeight:600,
  },
  card: {
    display:'flex', alignItems:'flex-start', gap:12,
    border:'1px solid var(--border)', borderRadius:8,
    padding:'10px 14px', marginBottom:5,
  },
  dot: { width:8, height:8, borderRadius:'50%', background:'var(--text3)', marginTop:5, flexShrink:0 },
  evTitle: { fontSize:13, fontWeight:500, marginBottom:4 },
  evMeta: { display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text2)', flexWrap:'wrap' },
  desc: { fontSize:11, color:'var(--text2)', marginTop:5 },
  days: { fontSize:11, color:'var(--text3)', whiteSpace:'nowrap', minWidth:70, textAlign:'right', marginTop:2 },
}
