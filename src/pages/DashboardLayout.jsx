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
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandLogo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#2563eb"/>
              <path d="M7 10h14M7 14h14M7 18h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="21" cy="18" r="3" fill="#60a5fa"/>
            </svg>
          </div>
          <div>
            <div style={styles.brandName}>SchoolAgenda</div>
            <div style={styles.brandSub}>Assessment Calendar</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          <div style={styles.navSection}>MENU</div>

          <NavLink to="/" end className="nav-link">
            {({ isActive }) => (
              <div style={isActive ? {...styles.navItem, ...styles.navItemActive} : styles.navItem}>
                <i className="ti ti-calendar" style={styles.navIcon} />
                <span>{isTeacher ? 'My calendar' : isAdmin ? 'All events' : 'Calendar'}</span>
              </div>
            )}
          </NavLink>

          {(isViewer || isTeacher) && (
            <NavLink to="/upcoming" className="nav-link">
              {({ isActive }) => (
                <div style={isActive ? {...styles.navItem, ...styles.navItemActive} : styles.navItem}>
                  <i className="ti ti-list-check" style={styles.navIcon} />
                  <span>Upcoming</span>
                </div>
              )}
            </NavLink>
          )}

          {isAdmin && (
            <>
              <div style={{...styles.navSection, marginTop: 20}}>ADMIN</div>
              <NavLink to="/admin" className="nav-link">
                {({ isActive }) => (
                  <div style={isActive ? {...styles.navItem, ...styles.navItemActive} : styles.navItem}>
                    <i className="ti ti-school" style={styles.navIcon} />
                    <span>School setup</span>
                  </div>
                )}
              </NavLink>
            </>
          )}

          {isViewer && (
            <>
              <div style={{...styles.navSection, marginTop: 20}}>ACCOUNT</div>
              <NavLink to="/settings" className="nav-link">
                {({ isActive }) => (
                  <div style={isActive ? {...styles.navItem, ...styles.navItemActive} : styles.navItem}>
                    <i className="ti ti-settings" style={styles.navIcon} />
                    <span>Settings</span>
                  </div>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User section */}
        <div style={styles.userSection}>
          <div style={styles.userCard}>
            <div style={styles.avatar}>
              {profile.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{profile.full_name}</div>
              <span className={`badge badge-${profile.role}`}>{profile.role}</span>
            </div>
          </div>
          <button style={styles.signOutBtn} onClick={handleSignOut}>
            <i className="ti ti-logout" style={{ fontSize: 14 }} />
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

const styles = {
  app: { display:'flex', minHeight:'100vh' },
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: 'var(--bg-sidebar)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 18px',
  },
  brandLogo: { flexShrink: 0 },
  brandName: { fontSize: 15, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' },
  brandSub: { fontSize: 11, color: 'var(--text-sidebar)', marginTop: 1, opacity: 0.7 },
  nav: { padding: '8px 12px', flex: 1 },
  navSection: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--text-sidebar)',
    opacity: 0.5,
    padding: '12px 8px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-sidebar)',
    textDecoration: 'none',
    marginBottom: 2,
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  navItemActive: {
    background: 'var(--bg-sidebar-active)',
    color: 'var(--text-sidebar-active)',
    fontWeight: 500,
  },
  navIcon: { fontSize: 17, opacity: 0.8 },
  userSection: {
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 8px 10px',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'var(--bg-sidebar-active)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  userName: {
    fontSize: 12,
    fontWeight: 500,
    color: '#fff',
    marginBottom: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    padding: '7px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: 'var(--text-sidebar)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  main: { flex: 1, overflow: 'auto', padding: '28px 32px', maxWidth: 'calc(100vw - 240px)' },
}
