'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { SectionCard } from '@/components/ui-kit'

interface Photo {
  name: string
  url: string
}

const ROTATIONS = [-4, 3, -2, 5, -5, 2, 4, -3]

export default function BoardTab() {
  const supabase = getSupabase()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadPhotos() {
    const { data } = await supabase.storage
      .from('vision-board')
      .list('', { sortBy: { column: 'created_at', order: 'desc' } })
    const items = (data || []).filter((f) => f.name !== '.emptyFolderPlaceholder')
    const mapped = items.map((f) => {
      const { data: pub } = supabase.storage
        .from('vision-board')
        .getPublicUrl(f.name)
      return { name: f.name, url: pub.publicUrl }
    })
    setPhotos(mapped)
    setLoading(false)
  }

  useEffect(() => {
    loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() || 'png'
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      await supabase.storage.from('vision-board').upload(name, file, {
        cacheControl: '3600',
        upsert: false,
      })
    }
    await loadPhotos()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function remove(name: string) {
    setPhotos((p) => p.filter((x) => x.name !== name))
    await supabase.storage.from('vision-board').remove([name])
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard
        title="Vision Board"
        action={
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            Upload
          </button>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading board…</p>
        ) : photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-accent/30 px-4 py-12 text-center">
            <p className="font-serif text-xl text-foreground">
              Picture the season ahead
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload photos that capture your goals. They’ll also appear on your
              login screen.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p, i) => (
              <figure
                key={p.name}
                className="group relative bg-card p-2 pb-6 shadow-md transition hover:z-10 hover:scale-105"
                style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url || '/placeholder.svg'}
                  alt="Vision board photo"
                  className="aspect-square w-full object-cover"
                />
                <button
                  onClick={() => remove(p.name)}
                  aria-label="Delete photo"
                  className="absolute right-1 top-1 rounded-full bg-card/90 p-1.5 text-muted-foreground opacity-0 shadow transition group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </figure>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
