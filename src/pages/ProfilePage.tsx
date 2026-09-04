import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArchiveRestore, Camera, Download, Globe2, Map, MapPin, Route, Save, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Field, Modal } from '../components/Ui'
import { useTravelStore } from '../store/travelStore'
import { compactDistance, countryCount, photoCount, tripDistance } from '../lib/format'
import type { TravelState } from '../types'
import type { Profile } from '../types'

export function ProfilePage() {
  const trips = useTravelStore((state) => state.trips)
  const memories = useTravelStore((state) => state.memories)
  const profile = useTravelStore((state) => state.profile)
  const updateProfile = useTravelStore((state) => state.updateProfile)
  const replaceData = useTravelStore((state) => state.replaceData)
  const resetAll = useTravelStore((state) => state.resetAll)
  const [editing, setEditing] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const distance = trips.reduce((sum, trip) => sum + tripDistance(trip), 0)
  const countries = [...new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.country)).filter(Boolean))]

  function exportData() {
    const payload: TravelState = { trips, memories, profile, trackingTripId: null, hasSeenWelcome: true }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `i-walk-this-earth-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as TravelState
      if (!Array.isArray(parsed.trips) || !Array.isArray(parsed.memories) || !parsed.profile) throw new Error('Invalid backup')
      if (window.confirm(`Replace this atlas with ${parsed.trips.length} imported trips?`)) replaceData(parsed)
    } catch { window.alert('That file is not a valid I Walk This Earth backup.') }
    event.target.value = ''
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>}<button onClick={() => setEditing(true)} className="no-print"><Camera size={17} /></button></div>
        <div className="profile-intro"><p className="eyebrow">The traveller</p><h1>{profile.name}</h1><p><MapPin size={16} /> {profile.home}</p><span>{profile.bio}</span><button className="button light no-print" onClick={() => setEditing(true)}>Edit profile</button></div>
      </section>
      <section className="profile-stats"><div><Globe2 size={22} /><strong>{countryCount(trips)}</strong><span>countries</span></div><div><Map size={22} /><strong>{trips.length}</strong><span>journeys</span></div><div><Route size={22} /><strong>{compactDistance(distance)}</strong><span>travelled</span></div><div><Camera size={22} /><strong>{photoCount(memories)}</strong><span>photos</span></div></section>
      <section className="profile-body">
        <div className="passport-panel"><p className="eyebrow">Your passport</p><h2>Places that changed<br />your map.</h2><div className="country-cloud">{countries.length ? countries.map((country, index) => <span className={`country-stamp stamp-${index % 4}`} key={country}>{country}</span>) : <p>Your first country will appear here.</p>}</div></div>
        <div className="data-panel"><p className="eyebrow">Your data</p><h2>A private atlas,<br />under your control.</h2><p>Trips and uploaded photos stay in this browser using IndexedDB. Export a backup regularly or move your atlas to another device.</p><div className="privacy-note"><ShieldCheck size={22} /><span><strong>Local by design</strong>No account, ad tracker, or personal-location server.</span></div><div className="data-actions no-print"><button className="button secondary" onClick={exportData}><Download size={17} /> Export backup</button><button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={17} /> Import backup</button><input ref={importRef} type="file" accept="application/json" hidden onChange={importData} /><button className="button danger-button" onClick={() => window.confirm('Reset the entire atlas to its original sample journeys? Your current local data will be replaced.') && resetAll()}><ArchiveRestore size={17} /> Reset sample</button></div></div>
      </section>
      {editing && <ProfileForm onClose={() => setEditing(false)} current={profile} onSave={updateProfile} />}
    </div>
  )
}

function ProfileForm({ current, onSave, onClose }: { current: Profile; onSave: (profile: Partial<Profile>) => void; onClose: () => void }) {
  const [name, setName] = useState(current.name)
  const [home, setHome] = useState(current.home)
  const [bio, setBio] = useState(current.bio)
  const [avatar, setAvatar] = useState(current.avatar)

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = () => setAvatar(String(reader.result))
    reader.readAsDataURL(file)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    onSave({ name, home, bio, avatar })
    onClose()
  }

  return <Modal title="Make it yours" eyebrow="Traveller profile" onClose={onClose} size="small"><form className="form-stack" onSubmit={submit}><div className="avatar-editor">{avatar ? <img src={avatar} alt="Profile preview" /> : <span>{name.charAt(0)}</span>}<label className="button secondary"><Camera size={16} /> Choose photo<input hidden type="file" accept="image/*" onChange={chooseAvatar} /></label>{avatar && <button className="icon-button" type="button" onClick={() => setAvatar('')}><Trash2 size={17} /></button>}</div><Field label="Your name"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Home"><input value={home} onChange={(event) => setHome(event.target.value)} placeholder="City, country" /></Field><Field label="A few words about you"><textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} /></Field><footer className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary"><Save size={16} /> Save profile</button></footer></form></Modal>
}
