import { useEffect, useState } from 'react'
import { del, get, keys } from 'idb-keyval'
import { useTravelStore } from '../store/travelStore'
import { allPhotos } from '../lib/albums'
import { photoKey, type PhotoFile } from '../lib/photoFiles'

export function StorageTools() {
  const [usage, setUsage] = useState<StorageEstimate>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const measure = async () => setUsage(await navigator.storage?.estimate?.() || {})
  useEffect(() => { void measure() }, [])
  const mb = (value: number) => `${(value / 1024 ** 2).toFixed(1)} MB`
  async function clean() {
    if (!confirm('Permanently delete unused local photo files older than 24 hours? Referenced albums are kept. Deleted files can only be recovered from your backups.')) return
    setBusy(true); setMessage('')
    try {
      if (!await useTravelStore.getState().refreshData()) throw new Error('Could not read the latest atlas.')
      const used = new Set(allPhotos(useTravelStore.getState()).map(p => photoKey(p.src)))
      let removed = 0
      for (const key of await keys()) {
        if (typeof key !== 'string' || !key.startsWith('photo:') || used.has(key.slice(6))) continue
        const file = await get<PhotoFile>(key)
        if (file?.createdAt && file.createdAt < Date.now() - 86400000) { await del(key); removed++ }
      }
      setMessage(`${removed} unused photo files removed. Recoverable only from an existing backup.`); await measure()
    } catch { setMessage('Cleanup failed. Your current albums have not been intentionally removed.') }
    finally { setBusy(false) }
  }
  return <section className="storage-tools"><h2>Device storage</h2><p>{mb(usage.usage || 0)} used{usage.quota ? ` of approximately ${mb(usage.quota)} available to this site` : ''}</p>{!!usage.quota && <progress value={usage.usage || 0} max={usage.quota} />}<p className="local-help">Photos, plans, and notes stay in this browser. Clearing site data removes them. Keep original-file copies and full backups outside the browser. Storage capacity varies by device.</p><div className="workspace-actions"><button className="button secondary" onClick={() => void measure()}>Refresh storage usage</button><button className="button secondary" onClick={async () => { const protectedStorage = await navigator.storage?.persist?.(); setMessage(protectedStorage ? 'Persistent storage granted. You still need backups.' : 'Persistent storage was not granted by this browser. Keep backups regularly.') }}>Request persistent storage</button><button className="button secondary" disabled={busy} onClick={() => void clean()}>Clean unused photo files</button></div>{message && <p role="status">{message}</p>}</section>
}
