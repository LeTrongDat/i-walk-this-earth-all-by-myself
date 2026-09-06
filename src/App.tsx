import { Navigate, Route, Routes } from 'react-router-dom'
import { useState, type ChangeEvent } from 'react'
import { validateTravelData } from './lib/validateTravelData'
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
  const storageError = useTravelStore((state) => state.storageError)
  const refreshData = useTravelStore((state) => state.refreshData)
  const clearStorageError = useTravelStore((state) => state.clearStorageError)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [recovering, setRecovering] = useState(false)
  useLocationTracking()

  async function importRecovery(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    setRecoveryError(null)
    setRecovering(true)
    try {
      const data = validateTravelData(JSON.parse(await file.text()))
      if (window.confirm(`Replace the saved atlas with ${data.trips.length} imported trips? Download a recovery copy first if you need the old data.`)) await useTravelStore.getState().replaceData(data)
    } catch (error) { setRecoveryError(error instanceof Error ? error.message : 'That backup could not be imported.') }
    finally { input.value = ''; setRecovering(false) }
  }

  if (!hydrated) {
    return <div className="splash"><div className="brand-mark"><span /></div>{storageError ? <div role="alert"><p>{storageError}</p><button className="button primary" disabled={recovering} onClick={() => void refreshData()}>Retry opening atlas</button><button className="button secondary" onClick={() => void useTravelStore.getState().downloadRawData()}>Download recovery copy</button><label className="button secondary">Import recovery backup<input type="file" accept="application/json" disabled={recovering} onChange={importRecovery} /></label><button className="button danger-button" disabled={recovering} onClick={async () => { if (window.confirm('Replace the saved atlas with sample journeys? Download a recovery copy first if you need the old data.')) { setRecovering(true); await useTravelStore.getState().resetAll(); setRecovering(false) } }}>Reset to sample journeys</button>{recoveryError && <p>{recoveryError}</p>}</div> : <p>Opening your atlas…</p>}</div>
  }

  return (
    <>
    {storageError && <div className="form-error" role="alert"><p>{storageError}</p><button className="button secondary" onClick={() => void refreshData()}>Reload saved atlas</button><button className="button ghost" onClick={clearStorageError}>Dismiss error</button></div>}
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
    </>
  )
}
