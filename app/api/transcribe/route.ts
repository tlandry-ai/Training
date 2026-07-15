import { experimental_transcribe as transcribe } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function isAuthed() {
  const cookieStore = await cookies()
  const c = cookieStore.get('temple_auth')
  return Boolean(c && c.value && c.value === process.env.APP_PASSWORD)
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const form = await req.formData()
    const file = form.get('audio')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await transcribe({
      model: gateway.transcriptionModel('openai/whisper-1'),
      audio: bytes,
    })

    return NextResponse.json({ text: result.text.trim() })
  } catch (err: any) {
    console.log('[v0] transcribe error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Transcription failed' },
      { status: 500 },
    )
  }
}
