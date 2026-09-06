import { del, get, set } from 'idb-keyval'
import type { Photo } from '../types'
import { uid } from './format'

export const photoKey = (src: string) => src.startsWith('local-photo:') ? src.slice(12) : null
export type PhotoFile = { original: Blob; thumbnail: Blob; createdAt?: number }
export async function photoBlob(src: string, thumbnail = false): Promise<Blob | null> {
  // Legacy image data URLs remain readable, and originals download as files.
  if (/^data:image\//i.test(src)) return (await fetch(src)).blob()
  const id = photoKey(src)
  if (!id) return null
  const file = await get<PhotoFile>(`photo:${id}`)
  if (!file) throw new Error('Photo file is missing. Restore a complete backup.')
  return thumbnail ? file.thumbnail : file.original
}
export async function savePhotoFile(file: File): Promise<Photo> {
  if (file.size > 200 * 1024 ** 2) throw new Error(`${file.name}: each photo must be 200 MB or smaller so it can be restored from backup.`)
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) throw new Error(`${file.name}: use JPEG, PNG, WebP, GIF, or AVIF. Convert HEIC before importing.`)
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 500 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    const thumbnail = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create thumbnail')), 'image/jpeg', .8))
    const id = uid('photo')
    await set(`photo:${id}`, { original: file, thumbnail, createdAt: Date.now() } satisfies PhotoFile)
    return { id, src: `local-photo:${id}`, name: file.name, caption: '', date: new Date(file.lastModified).toISOString().slice(0, 10), favorite: false }
  } finally { URL.revokeObjectURL(url) }
}
export async function discardPhotoFile(photo: Photo) {
  const id = photoKey(photo.src)
  if (id) await del(`photo:${id}`)
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
