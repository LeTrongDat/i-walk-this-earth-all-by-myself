import { useState } from 'react'
import { CalendarDays, MapPin, Plus, Route } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { TripForm } from '../components/TripForm'
import { StatusPill } from '../components/Ui'
import { useTravelStore } from '../store/travelStore'
import { compactDistance, formatDate, tripDistance } from '../lib/format'
import type { TripStatus } from '../types'

type Filter = 'all' | TripStatus

export function TripsPage() {
  const trips = useTravelStore((state) => state.trips)
  const [filter, setFilter] = useState<Filter>('all')
  const [newTrip, setNewTrip] = useState(false)
  const navigate = useNavigate()
  const visible = trips.filter((trip) => filter === 'all' || trip.status === filter)

  return (
    <div className="standard-page">
      <header className="page-header"><div><h1>Your journeys</h1></div><button className="button primary" onClick={() => setNewTrip(true)}><Plus size={18} /> New trip</button></header>
      <div className="filter-tabs no-print">{(['all', 'planned', 'active', 'completed'] as Filter[]).map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}<span>{item === 'all' ? trips.length : trips.filter((trip) => trip.status === item).length}</span></button>)}</div>
      <div className="trips-list">
        {visible.map((trip) => <Link to={`/trips/${trip.id}`} className="trip-row" key={trip.id}>
          <div className="trip-row-image"><img src={trip.cover} alt="" /><StatusPill status={trip.status} /></div>
          <div className="trip-row-content"><p>{formatDate(trip.startDate, 'MMMM yyyy')}</p><h2>{trip.title}</h2><span>{trip.summary || 'A journey waiting to be written.'}</span><div><span><CalendarDays size={16} /> {formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span><span><MapPin size={16} /> {trip.stops.length} places</span><span><Route size={16} /> {compactDistance(tripDistance(trip))}</span></div></div>
          <span className="round-arrow">→</span>
        </Link>)}
        {!visible.length && <div className="empty-filter"><Route size={28} /><h3>No {filter} journeys yet</h3><p>There is plenty of world left to see.</p></div>}
      </div>
      {newTrip && <TripForm onClose={() => setNewTrip(false)} onSaved={(id) => navigate(`/trips/${id}`)} />}
    </div>
  )
}
