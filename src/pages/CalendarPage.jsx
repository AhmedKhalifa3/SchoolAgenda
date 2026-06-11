import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import EventModal from '../components/EventModal'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const TYPE_COLOR = { Exam:'#E24B4A', Quiz:'#D85A30', Test:'#7F77DD', Homework:'#639922', Presentation:'#1D9E75' }
const TYPE_BG    = { Exam:'var(--red-light)', Quiz:'var(--coral-light)', Test:'var(--purple-light)', Homework:'var(--green-light)', Presentation:'var(--teal-light)' }
const TYPE_TEXT  = { Exam:'var(--red-text)', Quiz:'var(--coral-text)', Test:'var(--purple-text)', Homework:'var(--green-text)', Presentation:'var(--teal-text)' }

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

  // Determine which grade to fetch events for
  const gradeIdToUse = isParent && selectedChildId
    ? children.find(c => c.id === selectedChildId)?.grade_id
    : profile?.grade_id

  // Set default selected child on first load
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

    // Filter by grade based on role
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

  const conflicts   = getConflicts()
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

  // Determine page title
  let pageTitle = 'Calendar'
  if (isTeacher) pageTitle = 'My subjects calendar'
  else if (isAdmin) pageTitle = 'All events'
  else if (isParent && selectedChildId) {
    const selectedChild = children.find(c => c.id === selectedChildId)
    pageTitle = `Calendar — ${selectedChild?.grades?.name || ''}`
  } else if (isStudent) {
    pageTitle = `Calendar — ${profile?.grades?.name || ''}`
  }

  return (
    <div>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div style={{ flex: 1 }}>
          <div style={styles.titleRow}>
            <h2 style={styles.pageTitle}>{pageTitle}</h2>
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
          {conflictDays.length > 0 && (
            <div style={styles.conflictBanner}>
              <i className="ti ti-alert-triangle" aria-hidden="true" style={{ fontSize:15 }} />
              <span>
                <strong>{conflictDays.length} conflict day{conflictDays.length>1?'s':''}</strong> this month —
                multiple high-stakes assessments on the same day for the same grade.
              </span>
            </div>
          )}
        </div>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <i className="ti ti-plus" aria-hidden="true" /> Add event
          </button>
        )}
      </div>

      {/* Month navigator */}
      <div style={styles.calHeader}>
        <button className="btn btn-sm" onClick={() => changeMonth(-1)}>
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        <span style={styles.monthLabel}>{MONTHS[month]} {year}</span>
        <button className="btn btn-sm" onClick={() => changeMonth(1)}>
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={styles.grid}>
        {DAYS.map(d => <div key={d} style={styles.dow}>{d}</div>)}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40 }}><div className="spinner" /></div>
      ) : (
        <div style={styles.grid}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const dayEvs = events
              .filter(e => e.date === ds)
              .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
            const isConflict = conflicts[ds]
            const isToday = ds === td

            return (
              <div
                key={ds}
                style={{
                  ...styles.cell,
                  borderColor: isToday ? 'var(--blue)' : isConflict ? 'var(--amber)' : 'var(--border)',
                  background: isConflict ? 'var(--amber-light)' : 'var(--bg2)',
                }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                  <span style={{ fontSize:11, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--blue)' : 'var(--text2)' }}>{day}</span>
                  {isConflict && <span style={styles.conflictBadge}>⚠ {conflicts[ds].length}</span>}
                </div>
                {dayEvs.slice(0,3).map(ev => {
                  const startLabel = new Date(ev.starts_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
                  const endLabel = new Date(ev.ends_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
                  return (
                    <div
                      key={ev.id}
                      title={`${startLabel}–${endLabel} ${ev.title} — ${ev.subjects?.name} (${ev.profiles?.full_name})`}
                      onClick={() => isTeacher && ev.teacher_id === profile.id ? setModal(ev) : null}
                      style={{
                        ...styles.evChip,
                        background: TYPE_BG[ev.type],
                        color: TYPE_TEXT[ev.type],
                        cursor: (isTeacher && ev.teacher_id === profile.id) ? 'pointer' : 'default',
                      }}
                    >
                      <strong style={{ marginRight: 4 }}>{startLabel}</strong>{ev.title}
                    </div>
                  )
                })}
                {dayEvs.length > 3 && <div style={{ fontSize:9, color:'var(--text3)', paddingLeft:2 }}>+{dayEvs.length-3} more</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <div key={type} style={styles.legendItem}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:color }} />
            {type}
          </div>
        ))}
        <div style={styles.legendItem}>
          <div style={{ width:8, height:8, borderRadius:3, background:'var(--amber)' }} />
          Conflict day
        </div>
      </div>

      {/* Event modal for teachers */}
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
  pageHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, gap:16 },
  titleRow: { display:'flex', alignItems:'center', gap:12, marginBottom:6 },
  pageTitle: { fontSize:18, fontWeight:500, marginBottom:6 },
  childSelector: { padding:'6px 8px', borderRadius:6, border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontSize:13, cursor:'pointer' },
  conflictBanner: {
    display:'flex', alignItems:'center', gap:8,
    background:'var(--amber-light)', color:'var(--amber-text)',
    borderRadius:8, padding:'8px 12px', fontSize:12, marginBottom:4,
  },
  calHeader: { display:'flex', alignItems:'center', gap:12, marginBottom:8 },
  monthLabel: { fontSize:15, fontWeight:500, minWidth:150 },
  grid: { display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3, marginBottom:3 },
  dow: { textAlign:'center', fontSize:10, color:'var(--text3)', padding:'4px 0', letterSpacing:'0.04em' },
  cell: {
    minHeight:80, borderRadius:7,
    border:'1px solid var(--border)',
    padding:'4px 5px',
    overflow:'hidden',
  },
  evChip: {
    fontSize:10, padding:'1px 5px', borderRadius:3,
    marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
  },
  conflictBadge: {
    fontSize:9, background:'var(--amber)', color:'var(--amber-text)',
    padding:'0 4px', borderRadius:8, fontWeight:600,
  },
  legend: { display:'flex', gap:14, flexWrap:'wrap', marginTop:12 },
  legendItem: { display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text2)' },
}