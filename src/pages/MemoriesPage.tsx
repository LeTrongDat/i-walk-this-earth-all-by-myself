import { useMemo, useState } from 'react'
import { useTravelStore } from '../store/travelStore'
import { albumEntries } from '../lib/albums'
import { AlbumGallery } from '../components/AlbumGallery'

export function MemoriesPage() {
  const { trips, memories } = useTravelStore()
  const [tripId, setTripId] = useState('')
  const [country, setCountry] = useState('')
  const [cityId, setCityId] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState('oldest')
  const entries = useMemo(() => albumEntries(trips, memories), [trips, memories])
  const cities = trips.filter(t => !tripId || t.id === tripId).flatMap(t => t.stops).filter(c => !country || c.country === country)
  const filtered = entries.filter(e => (!tripId || e.tripId === tripId) && (!country || e.country === country) && (!cityId || e.cityId === cityId) && (!placeId || e.placeId === placeId) && (!favorites || e.photo.favorite) && `${e.place} ${e.city} ${e.photo.caption} ${e.photo.name}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (a.photo.date || '').localeCompare(b.photo.date || '') * (order === 'newest' ? -1 : 1))
  return <div className="standard-page archive-library"><header className="page-header"><div><h1>Photo library</h1><p>All your places, photos, and small moments. Stored on this device.</p></div></header><div className="library-filters">
    <input aria-label="Search photo library" placeholder="Search captions, cities, places…" value={query} onChange={e => setQuery(e.target.value)} />
    <select aria-label="Filter by trip" value={tripId} onChange={e => { setTripId(e.target.value); setCountry(''); setCityId(''); setPlaceId('') }}><option value="">All trips</option>{trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
    <select aria-label="Filter by country" value={country} onChange={e => { setCountry(e.target.value); setCityId(''); setPlaceId('') }}><option value="">All countries</option>{[...new Set(trips.filter(t => !tripId || t.id === tripId).flatMap(t => t.stops.map(c => c.country)))].map(c => <option key={c}>{c}</option>)}</select>
    <select aria-label="Filter by city" value={cityId} onChange={e => { setCityId(e.target.value); setPlaceId('') }}><option value="">All cities</option>{cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <select aria-label="Filter by place" value={placeId} onChange={e => setPlaceId(e.target.value)}><option value="">All places</option>{cities.filter(c => !cityId || c.id === cityId).flatMap(c => c.places ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <select aria-label="Photo order" value={order} onChange={e => setOrder(e.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select><label><input type="checkbox" checked={favorites} onChange={e => setFavorites(e.target.checked)} /> Favourites only</label>
  </div><AlbumGallery key={`${tripId}-${country}-${cityId}-${placeId}-${favorites}-${order}-${query}`} entries={filtered} title={placeId ? cities.flatMap(c => c.places || []).find(p => p.id === placeId)?.name : cityId ? cities.find(c => c.id === cityId)?.name : country || 'All photos'} /></div>
}
