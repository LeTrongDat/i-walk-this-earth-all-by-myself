import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArchiveRestore, Camera, Download, Globe2, Map, MapPin, Route, Save, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Field, Modal } from '../components/Ui'
import { useTravelStore } from '../store/travelStore'
import { compactDistance, countryCount, tripDistance } from '../lib/format'
import { exportArchive, readArchive } from '../lib/archiveBackup'
import { StorageTools } from '../components/StorageTools'
import { albumEntries } from '../lib/albums'
import type { Profile } from '../types'
import { validateTravelData } from '../lib/validateTravelData'
import { useDurableSave } from '../lib/useDurableSave'

export function ProfilePage() {
  const trips = useTravelStore((state) => state.trips)
  const memories = useTravelStore((state) => state.memories)
  const profile = useTravelStore((state) => state.profile)
  const updateProfile = useTravelStore((state) => state.updateProfile)
  const replaceData = useTravelStore((state) => state.replaceData)
  const resetAll = useTravelStore((state) => state.resetAll)
  const [editing, setEditing] = useState(false)
  const [backupProgress, setBackupProgress] = useState('')
  const { saving: dataBusy, error: dataError, setError: setDataError, save: commitData } = useDurableSave()
  const importRef = useRef<HTMLInputElement>(null)
  const distance = trips.reduce((sum, trip) => sum + tripDistance(trip), 0)
  const countries = [...new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.country)).filter(Boolean))]

  async function exportData() {
    setBackupProgress('Preparing full backup…'); setDataError(null)
    try {
      if (!await useTravelStore.getState().refreshData()) throw new Error('Could not read saved data.')
      const latest = useTravelStore.getState()
      await exportArchive(validateTravelData(latest), setBackupProgress)
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setDataError(e instanceof Error ? e.message : 'Backup could not be created.') }
    finally { setBackupProgress('') }
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    try {
      if (!window.confirm('Replace this atlas with the backup? Export your current atlas first. Existing unrelated local photo files are retained until cleanup.')) { input.value = ""; return }
      setBackupProgress('Reading backup…'); setDataError(null)
      const archive = await readArchive(file, setBackupProgress)
      if (!await replaceData(archive.data)) { await archive.cleanup(); throw new Error('Backup was not saved. Existing atlas was kept.') }
    } catch (error) { setDataError(error instanceof Error ? error.message : 'That file is not a valid I Walk This Earth backup.') }
    input.value = ''; setBackupProgress('')
  }

  return (
    <div className="profile-page">
      {backupProgress && <p className="storage-tools" role="status">{backupProgress}</p>}
      <StorageTools />
      {dataError && <p className="form-error" role="alert">{dataError}</p>}
      <section className="profile-hero">
        <div className="profile-avatar">{profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>}<button onClick={() => setEditing(true)} className="no-print"><Camera size={17} /></button></div>
        <div className="profile-intro"><p className="eyebrow">The traveller</p><h1>{profile.name}</h1><p><MapPin size={16} /> {profile.home}</p><span>{profile.bio}</span><button className="button light no-print" onClick={() => setEditing(true)}>Edit profile</button></div>
      </section>
      <section className="profile-stats"><div><Globe2 size={22} /><strong>{countryCount(trips)}</strong><span>countries</span></div><div><Map size={22} /><strong>{trips.length}</strong><span>journeys</span></div><div><Route size={22} /><strong>{compactDistance(distance)}</strong><span>travelled</span></div><div><Camera size={22} /><strong>{albumEntries(trips, memories).length}</strong><span>photos</span></div></section>
      <section className="profile-body">
        <div className="passport-panel"><p className="eyebrow">Your passport</p><h2>Places that changed<br />your map.</h2><div className="country-cloud">{countries.length ? countries.map((country, index) => <span className={`country-stamp stamp-${index % 4}`} key={country}>{country}</span>) : <p>Your first country will appear here.</p>}</div></div>
        <div className="data-panel"><p className="eyebrow">Your data</p><h2>A private atlas,<br />under your control.</h2><p>Trips and uploaded photos stay in this browser using IndexedDB. Full ZIP backups include original album photos, thumbnails, and plans. Older JSON backups can also be imported. ZIP backups support up to 3.8 GB; keep original-file copies for larger libraries.</p><div className="privacy-note"><ShieldCheck size={22} /><span><strong>Local by design</strong>No account, ad tracker, or personal-location server.</span></div><div className="data-actions no-print"><button className="button secondary" disabled={dataBusy || !!backupProgress} onClick={exportData}><Download size={17} /> Export backup</button><button className="button secondary" disabled={dataBusy || !!backupProgress} onClick={() => importRef.current?.click()}><Upload size={17} /> Import backup</button><input ref={importRef} type="file" accept="application/json,application/zip,.zip" hidden disabled={dataBusy || !!backupProgress} onChange={importData} /><button className="button danger-button" disabled={dataBusy || !!backupProgress} onClick={() => { if (window.confirm('Reset the entire atlas to its original sample journeys? Your current local data will be replaced.')) void commitData(resetAll, () => undefined) }}><ArchiveRestore size={17} /> Reset sample</button></div></div>
      </section>
      {editing && <ProfileForm onClose={() => setEditing(false)} current={profile} onSave={updateProfile} />}
    </div>
  )
}

function ProfileForm({ current, onSave, onClose }: { current: Profile; onSave: (profile: Partial<Profile>) => Promise<boolean>; onClose: () => void }) {
  const [name, setName] = useState(current.name)
  const [home, setHome] = useState(current.home)
  const [bio, setBio] = useState(current.bio)
  const [avatar, setAvatar] = useState(current.avatar)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const { saving, error, setError, save: commit } = useDurableSave()

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) { setError('Choose an image of 8 MB or less.'); return }
    setReadingPhoto(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => { setAvatar(String(reader.result)); setReadingPhoto(false) }
    reader.onerror = reader.onabort = () => { setError('The photo could not be read. Please choose it again.'); setReadingPhoto(false) }
    reader.readAsDataURL(file)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (readingPhoto) return
    if (!name.trim()) { setError('Enter your name.'); return }
    void commit(() => onSave({ name: name.trim(), home, bio, avatar }), onClose)
  }

  return <Modal title="Make it yours" eyebrow="Traveller profile" onClose={onClose} size="small"><form className="form-stack" onSubmit={submit}><div className="avatar-editor">{avatar ? <img src={avatar} alt="Profile preview" /> : <span>{name.charAt(0)}</span>}<label className="button secondary"><Camera size={16} /> Choose photo<input hidden type="file" accept="image/*" disabled={readingPhoto || saving} onChange={chooseAvatar} /></label>{avatar && <button className="icon-button" type="button" onClick={() => setAvatar('')}><Trash2 size={17} /></button>}</div><Field label="Your name"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Home"><input value={home} onChange={(event) => setHome(event.target.value)} placeholder="City, country" /></Field><Field label="A few words about you"><textarea rows={4} value={bio} onChange={(event) => setBio(event.target.value)} /></Field>{error && <p className="form-error" role="alert">{error}</p>}{readingPhoto && <p role="status">Reading photo…</p>}<footer className="modal-actions"><button type="button" className="button ghost" disabled={saving} onClick={onClose}>Cancel</button><button className="button primary" disabled={saving || readingPhoto}><Save size={16} /> {saving ? 'Saving…' : 'Save profile'}</button></footer></form></Modal>
}
