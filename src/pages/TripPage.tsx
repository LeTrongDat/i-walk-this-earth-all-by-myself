import { useState } from 'react'
import { ChevronLeft, Edit3, Ellipsis, Plus, Printer, Trash2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { TravelMap } from '../components/TravelMap'
import { TripForm } from '../components/TripForm'
import { StopForm } from '../components/StopForm'
import { MemoryForm } from '../components/MemoryForm'
import { AlbumGallery } from '../components/AlbumGallery'
import { CityWorkspace } from '../components/CityWorkspace'
import { DailyPlanner } from '../components/DailyPlanner'
import { useTravelStore } from '../store/travelStore'
import { albumEntries } from '../lib/albums'
import { formatDate } from '../lib/format'
import type { Memory, Stop } from '../types'

export function TripPage() {
  const { tripId } = useParams()
  const store = useTravelStore()
  const trip = store.trips.find(t => t.id === tripId)
  const navigate = useNavigate()
  const [tab, setTab] = useState('cities')
  const [cityId, setCityId] = useState('')
  const [tripEditor, setTripEditor] = useState(false)
  const [cityEditor, setCityEditor] = useState<Stop | 'new' | null>(null)
  const [noteEditor, setNoteEditor] = useState<Memory | 'new' | null>(null)
  const [menu, setMenu] = useState(false)
  const [country, setCountry] = useState('')
  if (!trip) return <Navigate to="/trips" replace />
  const city = trip.stops.find(c => c.id === cityId) || trip.stops[0]
  const memories = store.memories.filter(m => m.tripId === trip.id)
  const entries = albumEntries([trip], memories)
  return <article className="archive-trip">
    <header className="archive-trip-header"><div><Link className="text-link" to="/trips"><ChevronLeft size={16} /> All trips</Link><h1>{trip.title}</h1><p>{formatDate(trip.startDate)} — {formatDate(trip.endDate)} · {trip.stops.length} cities · {entries.length} photos</p></div><div className="workspace-actions"><Link className="button secondary" to={`/trips/${trip.id}/book?mode=plan`}><Printer size={16} /> Print playbook</Link><div className="menu-wrap"><button className="icon-button" aria-label="More actions" onClick={() => setMenu(v => !v)}><Ellipsis /></button>{menu && <div className="overflow-menu"><button onClick={() => { setTripEditor(true); setMenu(false) }}><Edit3 size={16} /> Edit trip</button><Link to={`/trips/${trip.id}/book?mode=photos`}>Print photobook</Link><button className="danger" onClick={async () => { if (confirm(`Delete “${trip.title}” and its memories? Export a backup first.`) && await store.deleteTrip(trip.id)) navigate('/trips') }}><Trash2 size={16} /> Delete trip</button></div>}</div></div></header>
    <div className="archive-trip-map"><TravelMap trips={[trip]} memories={memories} selectedTripId={trip.id} /></div>
    <div className="archive-tabs" role="tablist" aria-label="Trip workspace">{[['cities', 'Cities & places'], ['days', 'Daily plan'], ['photos', 'Photos'], ['notes', 'Notes']].map(([id, title]) => <button role="tab" key={id} aria-selected={tab === id} onClick={() => setTab(id)}>{title}</button>)}</div>
    <div className="archive-trip-body">
      {tab === 'cities' && <>
        <div className="city-tabs">{trip.stops.map((c, i) => <button key={c.id} aria-pressed={city?.id === c.id} onClick={() => setCityId(c.id)}><span>CITY {i + 1}</span><strong>{c.name}</strong><small>{c.country}</small></button>)}<button onClick={() => setCityEditor('new')}><Plus size={20} /><strong>{trip.stops.length ? 'Add city' : 'Add your first city'}</strong></button></div>
        {city && <><div className="city-tools"><button className="text-link" onClick={() => setCityEditor(city)}>Edit city dates & details</button><button className="text-danger" onClick={async () => { if (confirm(`Remove ${city.name}, its places, and daily plans? Existing journal notes stay in the trip. Export a backup first.`)) await store.deleteStop(trip.id, city.id) }}>Remove city</button></div><CityWorkspace key={city.id} trip={trip} city={city} /></>}
      </>}
      {tab === 'days' && <DailyPlanner trip={trip} />}
      {tab === 'photos' && <><div className="workspace-heading"><h2>Trip photo library</h2><Link className="button secondary" to={`/trips/${trip.id}/book?mode=photos`}>Print photobook</Link></div><select aria-label="Filter photos by country" value={country} onChange={e => setCountry(e.target.value)}><option value="">All countries</option>{[...new Set(entries.map(e => e.country).filter(Boolean))].map(c => <option key={c}>{c}</option>)}</select><AlbumGallery entries={entries.filter(e => !country || e.country === country)} title={country || 'All trip photos'} /></>}
      {tab === 'notes' && <section className="archive-notes"><div className="workspace-heading"><div><h2>Travel notes</h2><p>Optional stories and existing journal entries. Your albums don’t need posts.</p></div><button className="button primary" disabled={!trip.stops.length} onClick={() => setNoteEditor('new')}>Add a note</button></div>{memories.map(m => <article key={m.id}><p className="eyebrow">{formatDate(m.date)} · {m.place}</p><h3>{m.title}</h3><p className="preserve-lines">{m.story}</p><div className="workspace-actions"><button className="button secondary" onClick={() => setNoteEditor(m)}>Edit note</button><button className="text-danger" onClick={() => { if (confirm(`Delete “${m.title}” and its attached photos?`)) void store.deleteMemory(m.id) }}>Delete note</button></div></article>)}<div className="tracking-panel"><button className="button secondary" onClick={() => void store.setTrackingTrip(store.trackingTripId === trip.id ? null : trip.id)}>{store.trackingTripId === trip.id ? 'Stop tracking' : 'Track this trip'}</button><p>Optional GPS recording while the app is open. {trip.route.length} GPS points saved locally.</p></div></section>}
    </div>
    {tripEditor && <TripForm trip={trip} onClose={() => setTripEditor(false)} />}
    {cityEditor && <StopForm tripId={trip.id} stop={cityEditor === 'new' ? undefined : cityEditor} onClose={() => setCityEditor(null)} />}
    {noteEditor && <MemoryForm trip={trip} memory={noteEditor === 'new' ? undefined : noteEditor} onClose={() => setNoteEditor(null)} />}
  </article>
}
