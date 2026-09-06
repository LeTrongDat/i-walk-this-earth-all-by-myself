import { useState } from 'react'
import { ArrowRight, MapPin, Plus, Settings, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { TravelMap } from '../components/TravelMap'
import { TripForm } from '../components/TripForm'
import { StatusPill } from '../components/Ui'
import { useTravelStore } from '../store/travelStore'
import { compactDistance, countryCount, formatDate, tripDistance, tripDuration } from '../lib/format'
import { albumEntries } from '../lib/albums'

export function WorldPage() {
  const { trips, memories, profile, hasSeenWelcome, dismissWelcome } = useTravelStore()
  const [selectedTripId, setSelectedTripId] = useState<string>()
  const [newTrip, setNewTrip] = useState(false)
  const [tab, setTab] = useState<'trips' | 'stats'>('trips')
  const navigate = useNavigate()
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId)
  const distance = trips.reduce((sum, trip) => sum + tripDistance(trip), 0)

  return <div className="atlas-screen">
    <section className="atlas-map" aria-label="Your travel map">
      <TravelMap trips={trips} memories={memories} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} />
      <div className="atlas-map-title">My travel map</div>
      {selectedTrip && <div className="map-trip-card">
        <button className="card-close" onClick={() => setSelectedTripId(undefined)} aria-label="Show all trips"><X size={18} /></button>
        <img src={selectedTrip.cover} alt="" />
        <div><StatusPill status={selectedTrip.status} /><h3>{selectedTrip.title}</h3><Link to={`/trips/${selectedTrip.id}`}>View trip <ArrowRight size={16} /></Link></div>
      </div>}
    </section>
    <section className="atlas-sheet">
      <div className="sheet-handle" />
      <div className="atlas-profile">
        <div className="atlas-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name.charAt(0)}</div>
        <Link to="/profile" className="atlas-settings icon-button" aria-label="Edit profile"><Settings size={20} /></Link>
        <h1>{profile.name}</h1>
        <p><MapPin size={14} />{profile.home}</p>
        <div className="atlas-stats"><div><strong>{countryCount(trips)}</strong><span>countries</span></div><div><strong>{trips.length}</strong><span>trips</span></div><div><strong>{albumEntries(trips, memories).length}</strong><span>photos</span></div></div>
        <button className="button primary full-width" onClick={() => setNewTrip(true)}><Plus size={18} /> Add a trip</button>
      </div>
      <div className="atlas-tabs" role="tablist" aria-label="Travel overview"><button role="tab" aria-selected={tab === 'trips'} onClick={() => setTab('trips')}>Trips</button><button role="tab" aria-selected={tab === 'stats'} onClick={() => setTab('stats')}>Stats</button></div>
      {tab === 'trips' ? <div className="atlas-trips" role="tabpanel" aria-label="Trips">
        {!hasSeenWelcome && <div className="sample-note"><span>Example trips · Your changes stay on this device.</span><button className="icon-button" onClick={dismissWelcome} aria-label="Dismiss example notice"><X size={16} /></button></div>}
        {trips.map((trip) => <Link to={`/trips/${trip.id}`} className="atlas-trip" key={trip.id}>
          <img src={trip.cover} alt="" /><div className="atlas-trip-shade" /><StatusPill status={trip.status} />
          <div className="atlas-trip-copy"><span>{formatDate(trip.startDate, 'd MMM yyyy')} — {trip.endDate ? formatDate(trip.endDate, 'd MMM yyyy') : 'Ongoing'}</span><h2>{trip.title}</h2><p>{tripDuration(trip)} days · {trip.stops.length} cities · {compactDistance(tripDistance(trip))}</p></div>
        </Link>)}
        {!trips.length && <p className="atlas-empty">Your first trip starts here. Add a trip to begin planning.</p>}
      </div> : <div className="atlas-summary" role="tabpanel" aria-label="Stats"><h2>Your travels in numbers</h2><div><strong>{compactDistance(distance)}</strong><span>total distance</span></div><div><strong>{trips.reduce((sum, trip) => sum + trip.stops.length, 0)}</strong><span>cities visited or planned</span></div><div><strong>{albumEntries(trips, memories).length}</strong><span>photos saved</span></div></div>}
    </section>
    {newTrip && <TripForm onClose={() => setNewTrip(false)} onSaved={(id) => navigate(`/trips/${id}`)} />}
  </div>
}
