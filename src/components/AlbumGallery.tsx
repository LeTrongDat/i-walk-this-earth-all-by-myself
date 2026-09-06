import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Download, Expand, Play, Star, X } from 'lucide-react'
import { PhotoImage } from './PhotoImage'
import { Modal } from './Ui'
import type { AlbumEntry } from '../lib/albums'
import { downloadBlob, photoBlob } from '../lib/photoFiles'
import { useTravelStore } from '../store/travelStore'

export function AlbumGallery({ entries, title = 'Photos' }: { entries: AlbumEntry[]; title?: string }) {
  const [index, setIndex] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [seconds, setSeconds] = useState(4)
  const [limit, setLimit] = useState(60)
  const [error, setError] = useState('')
  const stage = useRef<HTMLDivElement>(null)
  const current = index === null ? undefined : entries[index % Math.max(1, entries.length)]
  useEffect(() => {
    if (!playing || index === null || entries.length < 2) return
    const timer = setInterval(() => setIndex(i => i === null ? null : (i + 1) % entries.length), seconds * 1000)
    return () => clearInterval(timer)
  }, [playing, index, entries.length, seconds])
  useEffect(() => {
    if (index === null) return
    function key(event: KeyboardEvent) {
      if ((event.target as HTMLElement).matches('input,textarea,select')) return
      if (event.key === 'ArrowRight') setIndex(i => ((i ?? 0) + 1) % entries.length)
      if (event.key === 'ArrowLeft') setIndex(i => ((i ?? 0) - 1 + entries.length) % entries.length)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [index, entries.length])
  async function changePhoto(entry: AlbumEntry, patch: Partial<AlbumEntry['photo']>) {
    const store = useTravelStore.getState()
    const success = await store.editAlbumPhoto(entry.tripId, entry.cityId, entry.placeId, entry.memoryId, entry.photo.id, patch)
    if (!success) setError('Photo changes were not saved.')
  }
  function close() { setPlaying(false); setIndex(null) }
  async function remove(entry: AlbumEntry) {
    if (!confirm('Remove this photo from the album? Its local file remains recoverable until unused-file cleanup.')) return
    const store = useTravelStore.getState()
    const success = await store.editAlbumPhoto(entry.tripId, entry.cityId, entry.placeId, entry.memoryId, entry.photo.id, null)
    if (success) close(); else setError('Photo was not removed. Please retry.')
  }
  return <section className="album-gallery">
    <div className="workspace-heading"><h3>{title} <small>{entries.length}</small></h3><button className="button secondary" disabled={!entries.length} onClick={() => { setIndex(0); setPlaying(true) }}><Play size={16} /> Slideshow</button></div>
    {!entries.length && <p className="workspace-empty">Add photos to a place’s album. No post or story required.</p>}
    <div className="album-grid">{entries.slice(0, limit).map((entry, i) => <button className="album-tile" key={`${entry.photo.id}-${entry.placeId}`} onClick={() => { setPlaying(false); setIndex(i) }} aria-label={`View photo ${i + 1}: ${entry.photo.name || entry.place}`}><PhotoImage src={entry.photo.src} thumbnail loading="lazy" alt={entry.photo.caption || entry.place} />{entry.photo.favorite && <Star className="favorite-badge" size={16} fill="currentColor" />}</button>)}</div>
    {entries.length > limit && <button className="button secondary" onClick={() => setLimit(n => n + 60)}>Load more photos ({entries.length - limit} remaining)</button>}
    {current && <Modal title={title} size="large" onClose={close}><div className="slideshow" ref={stage}>
      <div className="slideshow-image"><PhotoImage key={current.photo.src} src={current.photo.src} alt={current.photo.caption || current.place} /></div>
      <div className="slideshow-controls"><button className="icon-button" aria-label="Previous photo" onClick={() => setIndex(i => ((i ?? 0) - 1 + entries.length) % entries.length)}><ArrowLeft /></button><span>{(index ?? 0) % entries.length + 1} / {entries.length}</span><button className="icon-button" aria-label="Next photo" onClick={() => setIndex(i => ((i ?? 0) + 1) % entries.length)}><ArrowRight /></button><button className="button secondary" onClick={() => setPlaying(v => !v)}>{playing ? 'Pause' : 'Play'}</button><select aria-label="Slideshow interval" value={seconds} onChange={e => setSeconds(Number(e.target.value))}>{[2, 4, 6, 10].map(s => <option key={s} value={s}>{s} seconds</option>)}</select><button className="icon-button" aria-label="Fullscreen" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void stage.current?.requestFullscreen().catch(() => setError('Fullscreen is unavailable in this browser.')) }}><Expand size={18} /></button><button className="icon-button" aria-label="Close slideshow" onClick={close}><X size={18} /></button></div>
      <p>{current.city} · {current.place} · {current.photo.date || 'Undated'}</p>
      <div className="slideshow-controls"><button className="button secondary" aria-pressed={!!current.photo.favorite} onClick={() => void changePhoto(current, { favorite: !current.photo.favorite })}><Star size={16} fill={current.photo.favorite ? 'currentColor' : 'none'} /> Favourite</button><button className="button secondary" onClick={async () => { try { const blob = await photoBlob(current.photo.src); if (blob) downloadBlob(blob, current.photo.name || 'photo'); else window.open(current.photo.src, '_blank', 'noopener,noreferrer') } catch { setError('Could not read this photo.') } }}><Download size={16} /> Original</button></div>
      <label className="field">Caption<input key={current.photo.id} defaultValue={current.photo.caption || ''} onBlur={e => { if (e.target.value !== (current.photo.caption || '')) void changePhoto(current, { caption: e.target.value }) }} /></label>
      <label className="field">Photo date<input key={`${current.photo.id}-date`} type="date" defaultValue={current.photo.date || ''} onBlur={e => { if (e.target.value !== (current.photo.date || '')) void changePhoto(current, { date: e.target.value || undefined }) }} /></label>
      <button className="text-danger" onClick={() => void remove(current)}>Remove photo from album</button>
      {error && <p role="alert">{error}</p>}
    </div></Modal>}
  </section>
}
