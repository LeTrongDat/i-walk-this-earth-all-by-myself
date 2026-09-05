import { useMemo, useState, type CSSProperties } from 'react'
import { BedDouble, CalendarDays, ChevronLeft, CircleStop, Clock3, Edit3, Ellipsis, Footprints, ImagePlus, MapPin, Navigation, Plus, Printer, Share2, Sparkles, Trash2 } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { TravelMap } from '../components/TravelMap'
import { MemoryForm } from '../components/MemoryForm'
import { StopForm } from '../components/StopForm'
import { TripForm } from '../components/TripForm'
import { StatusPill } from '../components/Ui'
import { useTravelStore } from '../store/travelStore'
import { compactDistance, formatDate, tripDistance, tripDuration } from '../lib/format'
import type { Memory, Stop } from '../types'

const transportIcon: Record<string, string> = { walk: 'Walk', bike: 'Bike', car: 'Drive', train: 'Train', boat: 'Boat', flight: 'Fly', other: 'Travel' }

export function TripPage() {
  const { tripId } = useParams()
  const trips = useTravelStore((state) => state.trips)
  const allMemories = useTravelStore((state) => state.memories)
  const trackingTripId = useTravelStore((state) => state.trackingTripId)
  const setTrackingTrip = useTravelStore((state) => state.setTrackingTrip)
  const deleteTrip = useTravelStore((state) => state.deleteTrip)
  const deleteStop = useTravelStore((state) => state.deleteStop)
  const deleteMemory = useTravelStore((state) => state.deleteMemory)
  const trip = trips.find((item) => item.id === tripId)
  const navigate = useNavigate()
  const [tripEditor, setTripEditor] = useState(false)
  const [stopEditor, setStopEditor] = useState<Stop | 'new' | null>(null)
  const [memoryEditor, setMemoryEditor] = useState<Memory | 'new' | null>(null)
  const [memoryStop, setMemoryStop] = useState<string>()
  const [menuOpen, setMenuOpen] = useState(false)

  const memories = useMemo(() => allMemories.filter((item) => item.tripId === tripId).sort((a, b) => a.date.localeCompare(b.date)), [allMemories, tripId])
  if (!trip) return <Navigate to="/trips" replace />
  const isTracking = trackingTripId === trip.id

  async function shareTrip() {
    if (!trip) return
    const shareData = { title: trip.title, text: `${trip.title} — ${trip.summary}`, url: window.location.href }
    if (navigator.share) await navigator.share(shareData).catch(() => undefined)
    else await navigator.clipboard.writeText(window.location.href)
  }

  function removeTrip() {
    if (!trip) return
    if (window.confirm(`Delete “${trip.title}” and all of its memories? This cannot be undone.`)) {
      deleteTrip(trip.id)
      navigate('/trips')
    }
  }

  function addMemoryAt(stopId?: string) {
    setMemoryStop(stopId)
    setMemoryEditor('new')
  }

  return (
    <article className="trip-page">
      <header className="trip-cover" style={{ '--cover-image': `url("${trip.cover}")` } as CSSProperties}>
        <div className="trip-cover-shade" />
        <div className="trip-cover-tools no-print">
          <Link className="round-button" to="/trips"><ChevronLeft size={20} /> All trips</Link>
          <div className="tool-cluster"><button className="round-button compact" onClick={shareTrip}><Share2 size={18} /><span>Share</span></button><button className="round-button compact" onClick={() => window.print()}><Printer size={18} /><span>Book</span></button><div className="menu-wrap"><button className="round-button compact icon-only" onClick={() => setMenuOpen((value) => !value)} aria-label="More actions"><Ellipsis size={20} /></button>{menuOpen && <div className="overflow-menu"><button onClick={() => { setTripEditor(true); setMenuOpen(false) }}><Edit3 size={16} /> Edit trip</button><button className="danger" onClick={removeTrip}><Trash2 size={16} /> Delete trip</button></div>}</div></div>
        </div>
        <div className="trip-cover-content"><StatusPill status={trip.status} /><h1>{trip.title}</h1><p>{trip.summary}</p><div className="trip-cover-meta"><span><CalendarDays size={17} /> {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span><span><MapPin size={17} /> {trip.stops.length} places</span></div></div>
      </header>

      <section className="trip-overview">
        <div className="trip-stat"><strong>{tripDuration(trip)}</strong><span>days away</span></div><div className="trip-stat"><strong>{trip.stops.length}</strong><span>places</span></div><div className="trip-stat"><strong>{compactDistance(tripDistance(trip))}</strong><span>distance</span></div><div className="trip-stat"><strong>{memories.reduce((sum, item) => sum + item.photos.length, 0)}</strong><span>photos</span></div>
        <button className={`tracking-button no-print ${isTracking ? 'tracking' : ''}`} onClick={() => setTrackingTrip(isTracking ? null : trip.id)}>{isTracking ? <CircleStop size={19} /> : <Navigation size={19} />}{isTracking ? 'Stop tracking' : 'Track this trip'}</button>
      </section>
      {isTracking && <div className="tracking-notice no-print"><span className="tracking-pulse" /><div><strong>Recording your route</strong><span>Keep this installed web app open while travelling. {trip.route.length} GPS points saved privately.</span></div></div>}

      <section className="trip-map-section trip-map-first">
        <TravelMap trips={[trip]} memories={memories} selectedTripId={trip.id} />
        <div className="trip-map-title"><p className="eyebrow">The route</p><h2>{trip.stops.length ? `${trip.stops[0].name} to ${trip.stops.at(-1)?.name}` : 'Your map is waiting'}</h2><p>{trip.stops.length ? 'Every line begins with a place.' : 'Add your first place to begin drawing this journey.'}</p></div>
      </section>

      <section className="trip-story-layout">
        <aside className="itinerary-panel">
          <div className="panel-heading"><div><p className="eyebrow">The plan</p><h2>Itinerary</h2></div><button className="icon-button bordered no-print" onClick={() => setStopEditor('new')} title="Add a stop"><Plus size={19} /></button></div>
          <div className="itinerary-line">
            {trip.stops.map((stop, index) => <div className="itinerary-stop" key={stop.id}>
              <span className="stop-node">{index + 1}</span>
              <div className="stop-info"><p>{formatDate(stop.arrivalDate, 'EEE, MMM d')}</p><h3>{stop.name}</h3><span>{stop.country}</span><div className="stop-details">{stop.departureDate && <span><Clock3 size={14} /> Until {formatDate(stop.departureDate, 'MMM d')}</span>}{stop.accommodation && <span><BedDouble size={14} /> {stop.accommodation}</span>}<span><Footprints size={14} /> {transportIcon[stop.transport]}</span></div>{stop.activities.length > 0 && <div className="activity-chips">{stop.activities.map((activity) => <span key={activity}>{activity}</span>)}</div>}
                <div className="stop-actions no-print"><button onClick={() => setStopEditor(stop)}>Edit</button><button onClick={() => addMemoryAt(stop.id)}>Add memory</button><button className="danger-text" onClick={() => window.confirm(`Remove ${stop.name} from this trip?`) && deleteStop(trip.id, stop.id)}>Remove</button></div>
              </div>
            </div>)}
            {!trip.stops.length && <button className="add-first-stop no-print" onClick={() => setStopEditor('new')}><MapPin size={22} /><strong>Add your first place</strong><span>Search anywhere in the world</span></button>}
          </div>
          {trip.stops.length > 0 && <button className="button secondary full-width no-print" onClick={() => setStopEditor('new')}><Plus size={17} /> Add another place</button>}
        </aside>

        <div className="journal-panel">
          <div className="panel-heading"><div><p className="eyebrow">The story</p><h2>Travel journal</h2></div><button className="button primary no-print" onClick={() => addMemoryAt()} disabled={!trip.stops.length}><ImagePlus size={17} /> Add a memory</button></div>
          <div className="journal-list">
            {memories.map((memory, index) => <article className="journal-entry" key={memory.id}>
              <div className="journal-date"><span>{formatDate(memory.date, 'dd')}</span><small>{formatDate(memory.date, 'MMM')}</small></div>
              <div className="journal-content"><p className="memory-place"><MapPin size={14} /> {memory.place} <i /> {memory.mood}</p><h2>{memory.title}</h2><p className="journal-story">{memory.story}</p>
                {memory.photos.length > 0 && <div className={`journal-photos photos-${Math.min(memory.photos.length, 3)}`}>{memory.photos.slice(0, 3).map((photo) => <figure key={photo.id}><img src={photo.src} alt={photo.caption ?? ''} />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}{memory.photos.length > 3 && <span className="more-photos">+{memory.photos.length - 3}</span>}</div>}
                <div className="journal-actions no-print"><button onClick={() => setMemoryEditor(memory)}>Edit memory</button><button className="danger-text" onClick={() => window.confirm(`Delete “${memory.title}”?`) && deleteMemory(memory.id)}>Delete</button></div>
              </div>
              {index < memories.length - 1 && <div className="journal-rule" />}
            </article>)}
            {!memories.length && <div className="empty-journal"><Sparkles size={27} /><h3>The best part is still unwritten.</h3><p>Add a note, a photo, or the small detail you want to remember years from now.</p><button className="button primary no-print" onClick={() => addMemoryAt()} disabled={!trip.stops.length}>Create first memory</button></div>}
          </div>
        </div>
      </section>

      <footer className="trip-book-footer"><p className="eyebrow">End of this chapter</p><h2>{trip.title}</h2><p>{formatDate(trip.startDate, 'MMMM yyyy')} · {trip.stops.map((stop) => stop.country).filter((value, index, values) => values.indexOf(value) === index).join(' · ')}</p></footer>

      {tripEditor && <TripForm trip={trip} onClose={() => setTripEditor(false)} />}
      {stopEditor && <StopForm tripId={trip.id} stop={stopEditor === 'new' ? undefined : stopEditor} onClose={() => setStopEditor(null)} />}
      {memoryEditor && <MemoryForm trip={trip} memory={memoryEditor === 'new' ? undefined : memoryEditor} initialStopId={memoryStop} onClose={() => { setMemoryEditor(null); setMemoryStop(undefined) }} />}
    </article>
  )
}
