import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createFolder } from '../api/folders'
import { uploadImage } from '../api/images'
import { errorMessage } from '../api/client'
import { extractImages, prepareImage } from '../imageFiles'
import { formatBytes, plural } from '../format'
import { useAuth } from './AuthProvider'

export interface UploadItem {
  id: number
  kind: 'zip' | 'img'
  name: string
  state: 'queued' | 'working' | 'done' | 'error'
  status: string
  progress: number
  folderId?: number
}

interface UploadContextValue {
  items: UploadItem[]
  // Bumps whenever an upload finishes, so pages showing folders can reload.
  version: number
  addZip: (file: File) => void
  addImages: (files: File[], folderId: number) => void
  clearFinished: () => void
}

const UploadContext = createContext<UploadContextValue | null>(null)

// Runs uploads one at a time in the background, so they continue while you move around the app.
export function UploadProvider({ children }: { children: ReactNode }) {
  const { refresh } = useAuth()
  const [items, setItems] = useState<UploadItem[]>([])
  const [version, setVersion] = useState(0)
  const queue = useRef<(() => Promise<void>)[]>([])
  const running = useRef(false)
  const nextId = useRef(1)

  const update = (id: number, changes: Partial<UploadItem>) =>
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...changes } : item))

  const run = useCallback(async () => {
    if (running.current) return
    running.current = true
    while (queue.current.length) {
      await queue.current.shift()!()
      setVersion(v => v + 1)
    }
    running.current = false
    refresh()  // storage usage changed
  }, [refresh])

  const enqueue = (item: Omit<UploadItem, 'id' | 'state' | 'status' | 'progress'>, task: (id: number) => Promise<void>) => {
    const id = nextId.current++
    setItems(prev => [...prev, { ...item, id, state: 'queued', status: 'Waiting', progress: 0 }])
    queue.current.push(async () => {
      update(id, { state: 'working' })
      try {
        await task(id)
      } catch (err) {
        update(id, { state: 'error', status: errorMessage(err, err instanceof Error ? err.message : undefined) })
      }
    })
    run()
  }

  const addImages = (files: File[], folderId: number) => {
    for (const file of files) {
      enqueue({ kind: 'img', name: file.name, folderId }, async (id) => {
        const image = await prepareImage(file, file.name)
        await uploadImage(folderId, image, fraction => update(id, {
          progress: fraction,
          status: `Uploading · ${formatBytes(fraction * file.size)} of ${formatBytes(file.size)}`,
        }))
        update(id, { state: 'done', status: 'Done', progress: 1 })
      })
    }
  }

  // A zip becomes a new folder named after the archive.
  const addZip = (file: File) => {
    enqueue({ kind: 'zip', name: file.name }, async (id) => {
      update(id, { status: 'Extracting' })
      const { images, skipped } = await extractImages(file)
      if (!images.length) throw new Error('No images found in this zip')

      const folder = await createFolder(file.name.replace(/\.zip$/i, ''))
      update(id, { folderId: folder.id })
      let failed = 0
      for (const [i, entry] of images.entries()) {
        update(id, { status: `Uploading ${i + 1} of ${images.length}`, progress: i / images.length })
        try {
          await uploadImage(folder.id, await prepareImage(entry.blob, entry.name), fraction =>
            update(id, { progress: (i + fraction) / images.length }))
        } catch {
          failed++
        }
      }

      const notes = [failed && `${failed} failed`, skipped && `${skipped} other ${skipped === 1 ? 'file' : 'files'} skipped`].filter(Boolean)
      update(id, {
        state: failed === images.length ? 'error' : 'done',
        progress: 1,
        status: `Done · ${plural(images.length - failed, 'image')}${notes.length ? ` (${notes.join(', ')})` : ''}`,
      })
    })
  }

  const clearFinished = () => setItems(prev => prev.filter(item => item.state === 'queued' || item.state === 'working'))

  return (
    <UploadContext.Provider value={{ items, version, addZip, addImages, clearFinished }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUploads() {
  const ctx = useContext(UploadContext)
  if (!ctx) throw new Error('useUploads must be used within UploadProvider')
  return ctx
}
