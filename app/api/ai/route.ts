import { generateText } from 'ai'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const MODEL = 'openai/gpt-5-mini'
const SYSTEM_PROMPT =
  'You are a personal training assistant for Temple Landry — a Stanford D1 gymnast. Be concise, warm, direct.'

async function isAuthed() {
  const cookieStore = await cookies()
  const c = cookieStore.get('temple_auth')
  return Boolean(c && c.value && c.value === process.env.APP_PASSWORD)
}

// NOTE: gpt-5-mini is a reasoning model — hidden reasoning tokens count against
// maxOutputTokens. Budgets must be generous or the visible text comes back empty.
async function generate(prompt: string, maxTokens = 2000) {
  const { text } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    maxOutputTokens: maxTokens,
    prompt,
  })
  return text.trim()
}

function extractJson(text: string): any {
  // Strip code fences and find the first {...} block
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) return {}
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return {}
  }
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action, payload } = body as { action: string; payload: any }

  try {
    switch (action) {
      case 'daily-brief': {
        const { schedule, completionPct, recentNotes, dayLabel } = payload
        const prompt = `Today is ${dayLabel}. Here is today's schedule:\n${schedule}\n\nOver the last 7 days, Temple's session completion rate is ${completionPct}%.\n\nRecent coach notes:\n${recentNotes || '(none)'}\n\nWrite a 2-3 sentence morning brief to set up her day. Be warm and direct.`
        const text = await generate(prompt, 1500)
        return NextResponse.json({ text })
      }

      case 'meal-analysis': {
        const { mealType, description } = payload
        const prompt = `Analyze this ${mealType} for a D1 gymnast and estimate macros. Meal: "${description}".\n\nReturn ONLY valid JSON in this exact shape: {"protein": <grams int>, "carbs": <grams int>, "fats": <grams int>, "note": "<one short sentence of feedback>"}.`
        const text = await generate(prompt, 2000)
        const json = extractJson(text)
        return NextResponse.json({
          protein: Number(json.protein) || 0,
          carbs: Number(json.carbs) || 0,
          fats: Number(json.fats) || 0,
          note: json.note || '',
        })
      }

      case 'skill-analysis': {
        const { skillName, event, entry } = payload
        const prompt = `Temple practiced the skill "${skillName}" on ${event}. Her free-text practice log: "${entry}".\n\nStructure this into coaching feedback. Return ONLY valid JSON in this exact shape: {"went_well": "<short>", "needs_work": "<short>", "coach_feedback": "<short actionable cue>", "pattern": "<short observed pattern>"}.`
        const text = await generate(prompt, 2000)
        const json = extractJson(text)
        return NextResponse.json({
          went_well: json.went_well || '',
          needs_work: json.needs_work || '',
          coach_feedback: json.coach_feedback || '',
          pattern: json.pattern || '',
        })
      }

      case 'goal-nudge': {
        const { goals } = payload
        const prompt = `Here are Temple's active goals (title | category | deadline):\n${goals}\n\nIdentify the single most at-risk goal and write a 1-2 sentence motivating nudge about it.`
        const text = await generate(prompt, 1500)
        return NextResponse.json({ text })
      }

      case 'weekly-review': {
        const { stats, notes } = payload
        const prompt = `Here are Temple's stats for the past week:\n${stats}\n\nRecent notes:\n${notes || '(none)'}\n\nWrite a short paragraph summary of her week, then on a new line give exactly ONE concrete adjustment for next week prefixed with "Next week: ".`
        const text = await generate(prompt, 2000)
        return NextResponse.json({ text })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    console.log('[v0] AI route error:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'AI request failed' },
      { status: 500 },
    )
  }
}
