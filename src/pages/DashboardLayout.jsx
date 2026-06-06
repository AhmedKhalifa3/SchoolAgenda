import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (!profile) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )

  const isAdmin   = profile.role === 'admin'
  const isTeacher = profile.role === 'teacher'
  const isViewer  = ['student','parent'].includes(profile.role)

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>📅</div>
          <div>
            <div style={styles.brandName}>SchoolAgenda</div>
            {profile.grades && <div style={styles.brandGrade}>{profile.grades.name}</div>}
          </div>
        </div>

        <nav style={styles.nav}>
          <NavLink to="/" end style={navStyle} className="nav-link">
            <i className="ti ti-calendar" aria-hidden="true" />
            {isTeacher ? 'My calendar' : isAdmin ? 'All events' : 'Grade calendar'}
          </NavLink>

          {(isViewer || isTeacher) && (
            <NavLink to="/upcoming" style={navStyle} className="nav-link">
              <i className="ti ti-list" aria-hidden="true" />
              Upcoming
            </NavLink>
          )}

          {isAdmin && (
            <NavLink to="/admin" style={navStyle} className="nav-link">
              <i className="ti ti-settings" aria-hidden="true" />
              School setup
            </NavLink>
          )}
        </nav>

        <div style={styles.userSection}>
          <div style={styles.userName}>{profile.full_name}</div>
          <span className={`badge badge-${profile.role}`}>{profile.role}</span>
          <button className="btn btn-sm" style={{ marginTop:8, width:'100%', justifyContent:'center' }} onClick={handleSignOut}>
            <i className="ti ti-logout" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

function navStyle({ isActive }) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: isActive ? 500 : 400,
    color: isActive ? 'var(--blue)' : 'var(--text2)',
    background: isActive ? 'var(--blue-light)' : 'transparent',
    textDecoration: 'none',
    marginBottom: 2,
    transition: 'background 0.12s',
  }
}

const styles = {
  app: { display:'flex', minHeight:'100vh' },
  sidebar: {
    width: 210,
    flexShrink: 0,
    background: 'var(--bg2)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 14px',
    borderBottom: '1px solid var(--border)',
  },
  brandIcon: { fontSize: 22 },
  brandName: { fontSize: 14, fontWeight: 600 },
  brandGrade: { fontSize: 11, color: 'var(--text3)', marginTop: 1 },
  nav: { padding: '10px 8px', flex: 1 },
  userSection: {
    padding: '12px 14px',
    borderTop: '1px solid var(--border)',
  },
  userName: { fontSize: 12, fontWeight: 500, marginBottom: 4 },
  main: { flex: 1, overflow: 'auto', padding: '20px 24px' },
}
