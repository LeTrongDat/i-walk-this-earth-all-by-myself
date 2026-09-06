import { useState } from 'react'
import { ArrowRight, Bookmark, MapPin, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TripForm } from '../components/TripForm'

const places = [
  { name: 'Kyoto in the quiet season', country: 'Japan', tag: 'Culture', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85', note: 'Temple paths, mountain air, and rooms filled with morning light.' },
  { name: 'The road through Hà Giang', country: 'Vietnam', tag: 'Road trip', image: 'https://images.unsplash.com/photo-1570366583862-f91883984fde?auto=format&fit=crop&w=1200&q=85', note: 'Four unhurried days among limestone peaks and high passes.' },
  { name: 'Madeira on foot', country: 'Portugal', tag: 'Hiking', image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=1200&q=85', note: 'Levadas, cloud forests, and the Atlantic at every turn.' },
  { name: 'A train across the Alps', country: 'Switzerland', tag: 'Slow travel', image: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=1200&q=85', note: 'Window seats, small stations, and snow above the valleys.' },
  { name: 'Patagonia beyond the map', country: 'Argentina', tag: 'Wild places', image: 'https://images.unsplash.com/photo-1531761535209-180857e963b9?auto=format&fit=crop&w=1200&q=85', note: 'Long trails and weather that changes the shape of a day.' },
  { name: 'Marrakech to the Atlas', country: 'Morocco', tag: 'Food & culture', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=85', note: 'Courtyards, shared tables, and a road into ochre mountains.' }
]

export function DiscoverPage() {
  const [saved, setSaved] = useState<string[]>([])
  const [newTrip, setNewTrip] = useState(false)
  const navigate = useNavigate()
  return (
    <div className="discover-page">
      <section className="discover-hero"><div><h1>Discover</h1><p>Travel ideas for your next trip.</p><button className="button primary" onClick={() => setNewTrip(true)}><Plus size={18} /> Plan a trip</button></div></section>
      <section className="discover-content"><div className="section-heading"><h2>Featured places</h2></div><div className="discover-grid">{places.map((place, index) => <article className={`discover-card discover-card-${index + 1}`} key={place.name}><img src={place.image} alt="" /><button className={`save-button no-print ${saved.includes(place.name) ? 'saved' : ''}`} onClick={() => setSaved((items) => items.includes(place.name) ? items.filter((item) => item !== place.name) : [...items, place.name])} aria-label="Save place"><Bookmark size={18} fill={saved.includes(place.name) ? 'currentColor' : 'none'} /></button><div className="discover-overlay"><span>{place.tag}</span><h3>{place.name}</h3><p><MapPin size={14} /> {place.country}</p></div><div className="discover-detail"><p>{place.note}</p><button onClick={() => setNewTrip(true)}>Plan this journey <ArrowRight size={15} /></button></div></article>)}</div></section>
      {newTrip && <TripForm onClose={() => setNewTrip(false)} onSaved={(id) => navigate(`/trips/${id}`)} />}
    </div>
  )
}
