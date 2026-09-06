import { get, set, del } from 'idb-keyval'
import { Zip, ZipPassThrough, Unzip, UnzipInflate, strToU8, strFromU8 } from 'fflate'
import { allPhotos } from './albums'
import { photoKey, downloadBlob, type PhotoFile } from './photoFiles'
import { validateTravelData } from './validateTravelData'
import { uid } from './format'
import type { TravelState } from '../types'

type Manifest = { format: string; version: number; data: TravelState; files: Array<{ id: string; originalType: string; thumbnailType: string; originalHash: string; thumbnailHash: string }> }
type FileWriter = { write: (data: Uint8Array) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> }
type PickerWindow = Window & { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable: () => Promise<FileWriter> }> }
async function hash(blob: Blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function exportArchive(data: TravelState, progress: (message: string) => void) {
  const filename = `earth-full-backup-${new Date().toISOString().slice(0, 10)}.zip`
  const picker = (window as PickerWindow).showSaveFilePicker
  // Request the destination during the user's click, before asynchronous reads.
  const writer = picker ? await (await picker({ suggestedName: filename, types: [{ description: 'Local archive ZIP', accept: { 'application/zip': ['.zip'] } }] })).createWritable() : null
  const chunks: BlobPart[] = []
  let writes = Promise.resolve()
  let zipError: Error | null = null
  const zip = new Zip((error, chunk) => {
    if (error) { zipError = error; return }
    const copy = new Uint8Array(chunk)
    if (writer) writes = writes.then(() => writer.write(copy))
    else chunks.push(copy)
  })
  try {
    const ids = [...new Set(allPhotos(data).map(p => photoKey(p.src)).filter((s): s is string => !!s))]
    const files: Manifest['files'] = []
    let bytes = 0
    for (const id of ids) {
      const file = await get<PhotoFile>(`photo:${id}`)
      if (!file) throw new Error('A photo file is missing. Backup stopped; restore the missing photo first.')
      progress(`Verifying photo ${files.length + 1} of ${ids.length}…`)
      files.push({ id, originalType: file.original.type, thumbnailType: file.thumbnail.type, originalHash: await hash(file.original), thumbnailHash: await hash(file.thumbnail) })
      bytes += file.original.size + file.thumbnail.size
    }
    if (bytes > 3.8 * 1024 ** 3) throw new Error('This backup exceeds the supported 3.8 GB ZIP size. Keep separate original-file backups; this atlas cannot yet export that much in one archive.')
    async function append(name: string, blob: Blob) {
      const entry = new ZipPassThrough(name)
      zip.add(entry)
      const reader = blob.stream().getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        entry.push(value)
        await writes
        if (zipError) throw zipError
      }
      entry.push(new Uint8Array(), true)
      await writes
    }
    const metadata = new Blob([strToU8(JSON.stringify({ format: 'earth-local-archive', version: 1, data, files } satisfies Manifest))])
    if (metadata.size > 200 * 1024 ** 2) throw new Error('Archive metadata exceeds the 200 MB restore limit. Move large legacy note uploads into place albums before exporting.')
    await append('atlas.json', metadata)
    await append('atlas.sha256', new Blob([await hash(metadata)]))
    for (let i = 0; i < ids.length; i++) {
      progress(`Backing up photo ${i + 1} of ${ids.length}…`)
      const file = await get<PhotoFile>(`photo:${ids[i]}`)
      if (!file) throw new Error('A photo disappeared during backup. Please retry.')
      await append(`files/${ids[i]}/original`, file.original)
      await append(`files/${ids[i]}/thumbnail`, file.thumbnail)
    }
    zip.end(); await writes
    if (zipError) throw zipError
    if (writer) await writer.close()
    else downloadBlob(new Blob(chunks, { type: 'application/zip' }), filename)
  } catch (error) { zip.terminate(); if (writer) await writer.abort().catch(() => undefined); throw error }
}

// Stage imported files under fresh IDs. No current atlas/file is overwritten before validation.
export async function readArchive(file: File, progress: (message: string) => void) {
  if (file.name.toLowerCase().endsWith('.json')) {
    const data = validateTravelData(JSON.parse(await file.text()))
    if (allPhotos(data).some(p => photoKey(p.src))) throw new Error('This metadata-only JSON references photo files. Import its full ZIP backup instead.')
    return { data, cleanup: async () => undefined }
  }
  let manifest: Manifest | null = null
  let metadataHash = ''
  let expectedMetadataHash = ''
  let pending: Promise<void>[] = []
  const remap = new Map<string, string>()
  const originals = new Map<string, Blob>()
  const thumbnails = new Map<string, Blob>()
  const seen = new Set<string>()
  const staged: string[] = []
  let failure: Error | null = null
  const cleanup = async () => { await Promise.all(staged.map(id => del(`photo:${id}`))) }
  const unzip = new Unzip(entry => {
    if (failure) return
    if (seen.has(entry.name)) { failure = new Error('Duplicate backup entry.'); return }
    seen.add(entry.name)
    const parts: BlobPart[] = []
    let size = 0
    entry.ondata = (error, chunk, final) => {
      if (error) { failure = error; return }
      size += chunk.length
      if (size > 200 * 1024 ** 2) { failure = new Error('Backup entry exceeds 200 MB safety limit.'); entry.terminate(); return }
      parts.push(new Uint8Array(chunk))
      if (!final) return
      if (entry.name === 'atlas.json') {
        pending.push((async () => {
          const blob = new Blob(parts)
          metadataHash = await hash(blob)
          const parsed = JSON.parse(strFromU8(new Uint8Array(await blob.arrayBuffer()))) as Manifest
          if (parsed.format !== 'earth-local-archive' || parsed.version !== 1 || !Array.isArray(parsed.files)) throw new Error('Unsupported backup format.')
          const data = validateTravelData(parsed.data)
          const ids = new Set(allPhotos(data).map(p => photoKey(p.src)).filter(Boolean))
          if (ids.size !== parsed.files.length) throw new Error('Backup photo index is inconsistent.')
          for (const item of parsed.files) {
            if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(item.id) || !ids.has(item.id) || remap.has(item.id) || typeof item.originalType !== 'string' || typeof item.thumbnailType !== 'string' || !/^[a-f0-9]{64}$/.test(item.originalHash) || !/^[a-f0-9]{64}$/.test(item.thumbnailHash)) throw new Error('Invalid photo index.')
            remap.set(item.id, uid('photo'))
          }
          manifest = { ...parsed, data }
        })())
      } else if (entry.name === 'atlas.sha256') {
        pending.push((async () => { expectedMetadataHash = await new Blob(parts).text() })())
      } else {
        const match = /^files\/([a-zA-Z0-9_-]+)\/(original|thumbnail)$/.exec(entry.name)
        if (!match) { failure = new Error('Unexpected file in backup.'); return }
        const [, id, kind] = match
        // Resolve after the manifest's queued parse, even if both arrive in one ZIP chunk.
        const previous = Promise.all(pending)
        const task = previous.then(async () => {
          const info = manifest?.files.find(f => f.id === id)
          const newId = remap.get(id)
          if (!info || !newId) throw new Error('Photo missing from backup index.')
          const blob = new Blob(parts, { type: kind === 'original' ? info.originalType : info.thumbnailType })
          if (await hash(blob) !== (kind === 'original' ? info.originalHash : info.thumbnailHash)) throw new Error('Backup photo integrity check failed. Current data was not changed.')
          if (kind === 'original') originals.set(id, blob); else thumbnails.set(id, blob)
          if (originals.has(id) && thumbnails.has(id)) {
            await set(`photo:${newId}`, { original: originals.get(id)!, thumbnail: thumbnails.get(id)!, createdAt: Date.now() })
            staged.push(newId); originals.delete(id); thumbnails.delete(id)
          }
        })
        pending.push(task)
      }
    }
    entry.start()
  })
  unzip.register(UnzipInflate)
  try {
    const reader = file.stream().getReader()
    let read = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      unzip.push(value)
      await Promise.all(pending); pending = []
      if (failure) throw failure
      read += value.length; progress(`Reading backup… ${Math.round(read / file.size * 100)}%`)
    }
    unzip.push(new Uint8Array(), true); await Promise.all(pending)
    if (failure) throw failure
    const complete = manifest as Manifest | null
    if (!/^[a-f0-9]{64}$/.test(expectedMetadataHash) || metadataHash !== expectedMetadataHash) throw new Error('Backup metadata integrity check failed. Current data was not changed.')
    if (!complete || staged.length !== complete.files.length || originals.size || thumbnails.size) throw new Error('Backup is incomplete. Current data was not changed.')
    for (const photo of allPhotos(complete.data)) {
      const id = photoKey(photo.src)
      if (id) photo.src = `local-photo:${remap.get(id)!}`
    }
    return { data: complete.data, cleanup }
  } catch (error) { await Promise.allSettled(pending); await cleanup(); throw error }
}
