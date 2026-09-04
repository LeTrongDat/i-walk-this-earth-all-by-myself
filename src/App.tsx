import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { WorldPage } from './pages/WorldPage'
import { TripsPage } from './pages/TripsPage'
import { TripPage } from './pages/TripPage'
import { MemoriesPage } from './pages/MemoriesPage'
import { DiscoverPage } from './pages/DiscoverPage'
import { ProfilePage } from './pages/ProfilePage'
import { useTravelStore } from './store/travelStore'
import { useLocationTracking } from './hooks/useLocationTracking'

export default function App() {
  const hydrated = useTravelStore((state) => state.hydrated)
  useLocationTracking()

  if (!hydrated) {
    return <div className="splash"><div className="brand-mark"><span /></div><p>Opening your atlas…</p></div>
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<WorldPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="trips/:tripId" element={<TripPage />} />
        <Route path="memories" element={<MemoriesPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
