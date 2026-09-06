import { Compass, Images, Map, MapPinned, UserRound } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTravelStore } from '../store/travelStore'

const navigation = [
  { to: '/', label: 'World', icon: Map },
  { to: '/trips', label: 'Trips', icon: MapPinned },
  { to: '/memories', label: 'Photos', icon: Images },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/profile', label: 'You', icon: UserRound }
]

export function AppShell() {
  const location = useLocation()
  const profile = useTravelStore((state) => state.profile)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="app-shell">
      <header className="topbar no-print">
        <NavLink to="/" className="wordmark" aria-label="I Walk This Earth home">
          <span className="brand-mark"><span /></span>
          <span>I walk this earth</span>
        </NavLink>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
        </nav>
        <NavLink className="profile-chip" to="/profile">
          {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{profile.name.charAt(0).toUpperCase()}</span>}
          <span>{profile.name.split(' ')[0]}</span>
        </NavLink>
      </header>

      <main className="page-shell"><Outlet /></main>

      <nav className="mobile-nav no-print" aria-label="Mobile navigation">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}><Icon size={20} /><span>{label}</span></NavLink>
        ))}
      </nav>
    </div>
  )
}
