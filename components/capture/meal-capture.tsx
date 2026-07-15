'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey } from '@/lib/plan'

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

type Result = {
  fuel_read: string
  items: string
  protein: number
  carbs: number
  fats: number
}

export default function MealCapture({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = getSupabase()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mealType, setMealType] = useState('Breakfast')
  const [preview, setPreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [stage, setStage] = useState<'idle' | 'uploading' | 'reading' | 'done'>(
    'idle',
  )
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    setPreview(URL.createObjectURL(file))
    setStage('uploading')
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('meal-photos')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage
        .from('meal-photos')
        .getPublicUrl(path)
      setImageUrl(pub.publicUrl)

      setStage('reading')
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'meal-photo',
          payload: { imageUrl: pub.publicUrl, mealType },
        }),
      })
      if (!res.ok) throw new Error('AI read failed')
      const data: Result = await res.json()
      setResult(data)
      setStage('done')
    } catch (e: any) {
      console.log('[v0] meal capture error:', e?.message)
      setError('Could not read that photo. Try again.')
      setStage('idle')
    }
  }

  async function save() {
    if (!result) return
    await supabase.from('food_log').insert({
      date_key: dateKey(new Date()),
      meal_type: mealType,
      description: result.items || 'Photographed meal',
      image_url: imageUrl,
      fuel_read: result.fuel_read,
      ai_protein: result.protein,
      ai_carbs: result.carbs,
      ai_fats: result.fats,
      ai_note: result.fuel_read,
    })
    onSaved()
    onClose()
  }

  const busy = stage === 'uploading' || stage === 'reading'
  const cals = result
    ? result.protein * 4 + result.carbs * 4 + result.fats * 9
    : 0

  return (
    <div className="cap-sheet-backdrop" onClick={onClose}>
      <div
        className="cap-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Photograph a meal"
      >
        <div className="cap-sheet-head">
          <span className="eyebrow">Photograph a meal</span>
          <button onClick={onClose} aria-label="Close" className="cap-x">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="cap-chiprow">
          {MEAL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={`cap-chip ${mealType === t ? 'on' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>

        {!preview && (
          <button className="cap-drop" onClick={() => fileRef.current?.click()}>
            <Camera className="h-6 w-6" />
            <span className="cap-drop-lbl">Take or choose a photo</span>
            <span className="cap-drop-sub">Fuel read plus a calorie estimate</span>
          </button>
        )}

        {preview && (
          <div className="cap-photo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview || '/placeholder.svg'} alt="Meal" className="cap-photo" />
            {busy && (
              <div className="cap-photo-veil">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{stage === 'uploading' ? 'Uploading…' : 'Reading fuel…'}</span>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />

        {error && <p className="cap-err">{error}</p>}

        {result && stage === 'done' && (
          <div className="cap-result">
            <p className="cap-fuel">{result.fuel_read}</p>
            <div className="cap-macros">
              <span className="cap-cal">{cals} cal</span>
              <span style={{ color: 'var(--green-ink)' }}>{result.protein}g P</span>
              <span style={{ color: 'var(--blue-ink)' }}>{result.carbs}g C</span>
              <span style={{ color: 'var(--rose-ink)' }}>{result.fats}g F</span>
            </div>
            <div className="cap-actions">
              <button className="cap-retake" onClick={() => fileRef.current?.click()}>
                Retake
              </button>
              <button className="cap-save" onClick={save}>
                Save to log
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
