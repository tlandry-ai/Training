'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square, X } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { dateKey } from '@/lib/plan'

const EVENTS = ['Bars', 'Beam', 'Floor', 'Vault', 'Conditioning', 'Other']

export default function AudioCapture({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = getSupabase()
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [event, setEvent] = useState('Bars')
  const [status, setStatus] = useState<
    'idle' | 'recording' | 'working' | 'done'
  >('idle')
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      recRef.current?.stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => handleStop()
      rec.start()
      recRef.current = rec
      setStatus('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setError('Microphone access denied.')
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current)
    recRef.current?.stop()
    recRef.current?.stream?.getTracks().forEach((t) => t.stop())
  }

  async function handleStop() {
    setStatus('working')
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const path = `${Date.now()}.webm`
      const { error: upErr } = await supabase.storage
        .from('training-audio')
        .upload(path, blob, { upsert: true, contentType: 'audio/webm' })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage
        .from('training-audio')
        .getPublicUrl(path)
      setAudioUrl(pub.publicUrl)

      const fd = new FormData()
      fd.append('audio', blob, 'note.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('transcription failed')
      const data = await res.json()
      setTranscript(data.text || '')
      setStatus('done')
    } catch (e: any) {
      console.log('[v0] audio capture error:', e?.message)
      setError('Could not transcribe. You can still type it below.')
      setStatus('done')
    }
  }

  async function save() {
    await supabase.from('practice_entries').insert({
      date_key: dateKey(new Date()),
      event,
      skill_name: event,
      entry: transcript || '(voice note)',
      audio_url: audioUrl,
    })
    onSaved()
    onClose()
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60,
  ).padStart(2, '0')}`

  return (
    <div className="cap-sheet-backdrop" onClick={onClose}>
      <div
        className="cap-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Talk through training"
      >
        <div className="cap-sheet-head">
          <span className="eyebrow">Talk through training</span>
          <button onClick={onClose} aria-label="Close" className="cap-x">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="cap-chiprow">
          {EVENTS.map((e) => (
            <button
              key={e}
              onClick={() => setEvent(e)}
              className={`cap-chip ${event === e ? 'on' : ''}`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="cap-mic-zone">
          {status === 'idle' && (
            <button className="cap-mic" onClick={start} aria-label="Start recording">
              <Mic className="h-7 w-7" />
            </button>
          )}
          {status === 'recording' && (
            <button className="cap-mic rec" onClick={stop} aria-label="Stop recording">
              <Square className="h-6 w-6" />
            </button>
          )}
          {status === 'working' && (
            <div className="cap-mic working">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <span className="cap-timer">
            {status === 'recording'
              ? mmss
              : status === 'working'
                ? 'Transcribing…'
                : status === 'done'
                  ? 'Review & file'
                  : 'Tap to record'}
          </span>
        </div>

        {error && <p className="cap-err">{error}</p>}

        {status === 'done' && (
          <div className="cap-result">
            <textarea
              className="cap-transcript"
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="What happened in this session…"
            />
            <div className="cap-actions">
              <button
                className="cap-retake"
                onClick={() => {
                  setStatus('idle')
                  setTranscript('')
                  setAudioUrl(null)
                }}
              >
                Redo
              </button>
              <button className="cap-save" onClick={save}>
                File to {event}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
