import { useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, MapPin, Plus, Route, Sparkles, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { WorldMap } from '../components/WorldMap'
import { TripForm } from '../components/TripForm'
import { StatusPill } from '../components/Ui'
import { useTravelStore } from '../store/travelStore'
import { compactDistance, countryCount, formatDate, tripDistance } from '../lib/format'

export function WorldPage() {
  const trips = useTravelStore((state) => state.trips)
  const memories = useTravelStore((state) => state.memories)
  const hasSeenWelcome = useTravelStore((state) => state.hasSeenWelcome)
  const dismissWelcome = useTravelStore((state) => state.dismissWelcome)
  const [selectedTripId, setSelectedTripId] = useState<string>()
  const [newTrip, setNewTrip] = useState(false)
  const navigate = useNavigate()
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId)
  const totalDistance = useMemo(() => trips.reduce((sum, trip) => sum + tripDistance(trip), 0), [trips])
  const latestMemories = [...memories].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  return (
    <div className="world-page">
      {!hasSeenWelcome && (
        <div className="welcome-note no-print">
          <div className="welcome-icon"><Sparkles size={20} /></div>
          <div><strong>Your private atlas is ready.</strong><span>Two example journeys are waiting for you. Edit them, delete them, or begin somewhere new.</span></div>
          <button className="icon-button" onClick={dismissWelcome} aria-label="Dismiss"><X size={18} /></button>
        </div>
      )}

      <section className="world-hero">
        <div className="world-copy">
          <p className="eyebrow">Your world, one story at a time</p>
          <h1>Where will your<br /><em>story</em> take you?</h1>
          <p className="hero-intro">Plan the road ahead, trace the one beneath your feet, and keep the moments that made it yours.</p>
          <button className="button primary button-large" onClick={() => setNewTrip(true)}><Plus size={19} /> Plan a new trip</button>
          <div className="world-stats">
            <div><strong>{countryCount(trips)}</strong><span>countries</span></div>
            <div><strong>{trips.length}</strong><span>journeys</span></div>
            <div><strong>{compactDistance(totalDistance)}</strong><span>travelled</span></div>
          </div>
        </div>

        <div className="hero-map-wrap">
          <WorldMap trips={trips} memories={memories} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} />
          <div className="map-legend no-print"><span><i className="legend-completed" /> Travelled</span><span><i className="legend-planned" /> Dreaming</span></div>
          {selectedTrip && <div className="map-trip-card no-print">
            <button className="card-close" onClick={() => setSelectedTripId(undefined)} aria-label="Close"><X size={17} /></button>
            <img src={selectedTrip.cover} alt="" />
            <div><StatusPill status={selectedTrip.status} /><h3>{selectedTrip.title}</h3><p><MapPin size={14} /> {selectedTrip.stops.map((stop) => stop.name).join(' · ') || 'Add your first place'}</p><Link to={`/trips/${selectedTrip.id}`}>Open journey <ArrowRight size={15} /></Link></div>
          </div>}
        </div>
      </section>

      <section className="content-section journey-section">
        <div className="section-heading"><div><p className="eyebrow">Your journeys</p><h2>Somewhere you’ve been,<br />somewhere you’re going.</h2></div><Link className="text-link" to="/trips">View all trips <ArrowRight size={16} /></Link></div>
        <div className="journey-grid">
          {trips.slice(0, 3).map((trip) => <Link to={`/trips/${trip.id}`} className="journey-card" key={trip.id}>
            <div className="journey-image"><img src={trip.cover} alt="" /><StatusPill status={trip.status} /><span className="stop-count"><MapPin size={14} /> {trip.stops.length} stops</span></div>
            <div className="journey-body"><p>{formatDate(trip.startDate, 'MMM yyyy')}</p><h3>{trip.title}</h3><span>{trip.summary}</span><div className="journey-meta"><span><CalendarDays size={15} /> {formatDate(trip.startDate, 'MMM d')} – {formatDate(trip.endDate, 'MMM d')}</span><span><Route size={15} /> {compactDistance(tripDistance(trip))}</span></div></div>
          </Link>)}
          <button className="new-journey-card" onClick={() => setNewTrip(true)}><span><Plus size={24} /></span><strong>Begin a new journey</strong><small>Even the longest road starts with one place.</small></button>
        </div>
      </section>

      {latestMemories.length > 0 && <section className="memory-strip">
        <div className="memory-strip-copy"><p className="eyebrow">From your journal</p><h2>Little moments.<br />Kept forever.</h2><p>The roads blur with time. The way a place felt doesn’t have to.</p><Link className="button light" to="/memories">Open your memories <ArrowRight size={17} /></Link></div>
        <div className="memory-collage">{latestMemories.map((memory, index) => <Link to={`/trips/${memory.tripId}`} key={memory.id} className={`memory-photo memory-photo-${index + 1}`}><img src={memory.photos[0]?.src || trips.find((trip) => trip.id === memory.tripId)?.cover} alt="" /><span>{memory.place}</span></Link>)}</div>
      </section>}

      {newTrip && <TripForm onClose={() => setNewTrip(false)} onSaved={(id) => navigate(`/trips/${id}`)} />}
    </div>
  )
}
