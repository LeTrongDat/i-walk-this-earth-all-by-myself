import { useEffect, useState } from 'react'
import { photoBlob, photoKey } from '../lib/photoFiles'

export function PhotoImage({ src, alt = '', thumbnail = false, ...props }: { src: string; alt?: string; thumbnail?: boolean; className?: string; loading?: 'lazy' | 'eager' }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true, objectURL = ''
    if (photoKey(src)) void photoBlob(src, thumbnail).then(blob => {
      if (active && blob) { objectURL = URL.createObjectURL(blob); setUrl(objectURL); setFailed(false) }
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [src, thumbnail])
  const resolved = photoKey(src) ? url : src
  if (failed) return <span className="photo-missing">Photo unavailable · restore its backup</span>
  return resolved ? <img {...props} src={resolved} alt={alt} /> : <span className="photo-loading" aria-label="Loading photo" />
}
