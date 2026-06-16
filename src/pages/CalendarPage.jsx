import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import EventModal from '../components/EventModal'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const TYPE_BG    = { Exam:'var(--red-light)', Quiz:'var(--coral-light)', Test:'var(--purple-light)', Homework:'var(--green-light)', Presentation:'var(--teal-light)' }
const TYPE_TEXT  = { Exam:'var(--red-text)', Quiz:'var(--coral-text)', Test:'var(--purple-text)', Homework:'var(--green-text)', Presentation:'var(--teal-text)' }
const TYPE_DOT   = { Exam:'#dc2626', Quiz:'#ea580c', Test:'#7c3aed', Homework:'#16a34a', Presentation:'#0d9488' }

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function CalendarPage() {
  const { profile, children } = useAuth()
  const today = new Date()
  const [year, setYear]     = useState(today.getFullYear())
  const [month, setMonth]   = useState(today.getMonth())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null)
  const [selectedChildId, setSelectedChildId] = useState(null)

  const isTeacher = profile?.role === 'teacher'
  const isAdmin   = profile?.role === 'admin'
  const isParent  = profile?.role === 'parent'
  const isStudent = profile?.role === 'student'

  const gradeIdToUse = isParent && selectedChildId
    ? children.find(c => c.id === selectedChildId)?.grade_id
    : profile?.grade_id

  useEffect(() => {
    if (isParent && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id)
    }
  }, [children, isParent, selectedChildId])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`
    const endDay    = new Date(year, month+1, 0).getDate()
    const endDate   = `${year}-${String(month+1).padStart(2,'0')}-${endDay}`

    let query = supabase
      .from('events')
      .select('*, subjects(name), profiles(full_name), grades(name)')
      .gte('date', startDate)
      .lte('date', endDate)

    if (isStudent || (isParent && gradeIdToUse)) {
      query = query.eq('grade_id', gradeIdToUse)
    }

    const { data, error } = await query.order('starts_at')
    if (!error && data) setEvents(data)
    setLoading(false)
  }, [year, month, isStudent, isParent, gradeIdToUse])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  function changeMonth(delta) {
    setMonth(m => {
      let nm = m + delta
      if (nm > 11) { setYear(y => y+1); return 0 }
      if (nm < 0)  { setYear(y => y-1); return 11 }
      return nm
    })
  }

  function getConflicts() {
    const highStakes = events.filter(e => ['Exam','Quiz','Test'].includes(e.type))
    const byDayGrade = {}
    highStakes.forEach(e => {
      const key = `${e.date}__${e.grade_id}`
      byDayGrade[key] = (byDayGrade[key] || []).concat(e)
    })
    const conflicts = {}
    Object.entries(byDayGrade).forEach(([key, evs]) => {
      if (evs.length > 1) {
        const [date] = key.split('__')
        conflicts[date] = (conflicts[date] || []).concat(evs)
      }
    })
    return conflicts
  }

  const conflicts = getConflicts()
  const conflictDays = Object.keys(conflicts)

  function buildCalendar() {
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month+1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }

  const cells = buildCalendar()
  const td = todayStr()

  let pageTitle = 'Calendar'
  if (isTeacher) pageTitle = 'My Subjects'
  else if (isAdmin) pageTitle = 'All Events'
  else if (isParent && selectedChildId) {
    const c = children.find(c => c.id === selectedChildId)
    pageTitle = c?.grades?.name || 'Calendar'
  } else if (isStudent) {
    pageTitle = profile?.grades?.name || 'Calendar'
  }

  return (
    <div>
      {/* Page header */}
      <div style={styles.header}>
        <div style={{ flex: 1 }}>
          <div style={styles.titleRow}>
            <h1 style={styles.pageTitle}>{pageTitle}</h1>
            {isParent && children.length > 0 && (
              <select
                value={selectedChildId || ''}
                onChange={e => setSelectedChildId(e.target.value)}
                style={styles.childSelector}
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.full_name} ({child.grades?.name})
                  </option>
                ))}
              </select>
            )}
          </div>
          <p style={styles.subtitle}>
            {isTeacher ? 'View and manage your subject assessments' : 'Assessment schedule overview'}
          </p>
        </div>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <i className="ti ti-plus" aria-hidden="true" /> New event
          </button>
        )}
      </div>

      {/* Conflict banner */}
      {conflictDays.length > 0 && (
        <div style={styles.conflictBanner}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} />
          <span>
            <strong>{conflictDays.length} conflict{conflictDays.length>1?'s':''}</strong> this month — multiple assessments on the same day for the same grade.
          </span>
        </div>
      )}

      {/* Calendar card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Month nav */}
        <div style={styles.calHeader}>
          <button className="btn btn-sm" onClick={() => changeMonth(-1)}>
            <i className="ti ti-chevron-left" />
          </button>
          <h2 style={styles.monthLabel}>{MONTHS[month]} {year}</h2>
          <button className="btn btn-sm" onClick={() => changeMonth(1)}>
            <i className="ti ti-chevron-right" />
          </button>
          <button className="btn btn-sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} style={{ marginLeft: 8 }}>
            Today
          </button>
        </div>

        {/* Day headers */}
        <div style={styles.grid}>
          {DAYS.map(d => <div key={d} style={styles.dow}>{d}</div>)}
        </div>

        {/* Calendar cells */}
        {loading ? (
          <div style={{ textAlign:'center', padding: 60 }}><div className="spinner" /></div>
        ) : (
          <div style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} style={styles.emptyCell} />
              const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const dayEvs = events.filter(e => e.date === ds).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
              const isConflict = conflicts[ds]
              const isToday = ds === td

              return (
                <div
                  key={ds}
                  style={{
                    ...styles.cell,
                    ...(isToday ? styles.cellToday : {}),
                    ...(isConflict ? styles.cellConflict : {}),
                  }}
                >
                  <div style={styles.cellHeader}>
                    <span style={{
                      ...styles.dayNum,
                      ...(isToday ? styles.dayNumToday : {}),
                    }}>{day}</span>
                    {isConflict && <span style={styles.conflictBadge}>⚠</span>}
                  </div>
                  <div style={styles.cellEvents}>
                    {dayEvs.slice(0,3).map(ev => {
                      const startLabel = new Date(ev.starts_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
                      return (
                        <div
                          key={ev.id}
                          title={`${ev.title} — ${ev.subjects?.name} (${ev.profiles?.full_name})`}
                          onClick={() => isTeacher && ev.teacher_id === profile.id ? setModal(ev) : null}
                          style={{
                            ...styles.evChip,
                            background: TYPE_BG[ev.type],
                            color: TYPE_TEXT[ev.type],
                            borderLeft: `3px solid ${TYPE_DOT[ev.type]}`,
                            cursor: (isTeacher && ev.teacher_id === profile.id) ? 'pointer' : 'default',
                          }}
                        >
                          <span style={{ fontWeight: 600, marginRight: 4 }}>{startLabel}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                        </div>
                      )
                    })}
                    {dayEvs.length > 3 && <div style={styles.moreLabel}>+{dayEvs.length-3} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(TYPE_DOT).map(([type, color]) => (
          <div key={type} style={styles.legendItem}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span>{type}</span>
          </div>
        ))}
        <div style={styles.legendItem}>
          <div style={{ width: 8, height: 8, borderRadius: 3, background: 'var(--amber)' }} />
          <span>Conflict day</span>
        </div>
      </div>

      {modal && (
        <EventModal
          event={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchEvents() }}
        />
      )}
    </div>
  )
}

const styles = {
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 20, gap: 16 },
  titleRow: { display:'flex', alignItems:'center', gap: 12, marginBottom: 4 },
  pageTitle: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 13, color: 'var(--text3)' },
  childSelector: { padding:'6px 10px', borderRadius: 6, border:'1px solid var(--border2)', background:'var(--bg2)', color:'var(--text)', fontSize: 13, cursor:'pointer' },
  conflictBanner: {
    display:'flex', alignItems:'center', gap: 10,
    background:'var(--amber-light)', color:'var(--amber-text)', border: '1px solid var(--amber)',
    borderRadius: 10, padding:'10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500,
  },
  calHeader: { display:'flex', alignItems:'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid var(--border)' },
  monthLabel: { fontSize: 16, fontWeight: 600, minWidth: 160 },
  grid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)' },
  dow: { textAlign:'center', fontSize: 11, fontWeight: 600, color:'var(--text3)', padding:'10px 0', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  emptyCell: { minHeight: 90, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' },
  cell: {
    minHeight: 90,
    borderBottom: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
    padding: '6px 8px',
    transition: 'background 0.1s',
  },
  cellToday: { background: 'var(--blue-light)' },
  cellConflict: { background: 'var(--amber-light)' },
  cellHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4 },
  dayNum: { fontSize: 12, fontWeight: 500, color: 'var(--text2)' },
  dayNumToday: { color: 'var(--blue)', fontWeight: 700 },
  conflictBadge: { fontSize: 10, background:'var(--amber)', color:'#fff', padding:'1px 4px', borderRadius: 4, fontWeight: 700 },
  cellEvents: { display: 'flex', flexDirection: 'column', gap: 2 },
  evChip: {
    fontSize: 10, padding:'2px 6px', borderRadius: 4,
    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
    display: 'flex', alignItems: 'center',
  },
  moreLabel: { fontSize: 10, color:'var(--text3)', paddingLeft: 4, fontWeight: 500 },
  legend: { display:'flex', gap: 16, flexWrap:'wrap', marginTop: 16, padding: '0 4px' },
  legendItem: { display:'flex', alignItems:'center', gap: 6, fontSize: 12, color:'var(--text2)' },
}
