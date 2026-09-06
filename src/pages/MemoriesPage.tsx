import { useMemo, useState } from 'react'
import { Images, MapPin, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTravelStore } from '../store/travelStore'
import { formatDate, photoCount } from '../lib/format'

export function MemoriesPage() {
  const memories = useTravelStore((state) => state.memories)
  const trips = useTravelStore((state) => state.trips)
  const [query, setQuery] = useState('')
  const [tripFilter, setTripFilter] = useState('all')
  const filtered = useMemo(() => memories.filter((memory) => {
    const matchesTrip = tripFilter === 'all' || memory.tripId === tripFilter
    const text = `${memory.title} ${memory.place} ${memory.story}`.toLowerCase()
    return matchesTrip && text.includes(query.toLowerCase())
  }).sort((a, b) => b.date.localeCompare(a.date)), [memories, query, tripFilter])

  return (
    <div className="standard-page memories-page">
      <header className="page-header"><div><h1>Memories</h1><p>{memories.length} stories · {photoCount(memories)} photos saved on this device</p></div></header>
      <div className="library-tools no-print"><div className="input-with-icon library-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, stories, feelings…" /></div><select aria-label="Filter by trip" value={tripFilter} onChange={(event) => setTripFilter(event.target.value)}><option value="all">All journeys</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.title}</option>)}</select></div>
      {filtered.length ? <div className="memory-library">{filtered.map((memory, index) => {
        const trip = trips.find((item) => item.id === memory.tripId)
        const image = memory.photos[0]?.src || trip?.cover
        return <Link className={`library-card card-shape-${index % 4}`} to={`/trips/${memory.tripId}`} key={memory.id}>{image && <div className="library-image"><img src={image} alt="" />{memory.photos.length > 1 && <span>+{memory.photos.length - 1}</span>}</div>}<div className="library-copy"><p><MapPin size={14} /> {memory.place}</p><h2>{memory.title}</h2><span>{memory.story}</span><footer><time>{formatDate(memory.date)}</time><em>{memory.mood}</em></footer></div></Link>
      })}</div> : <div className="empty-filter"><Images size={30} /><h3>No memories found</h3><p>Try another search, or add a memory from one of your trips.</p></div>}
    </div>
  )
}
