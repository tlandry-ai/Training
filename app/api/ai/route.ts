import { generateText, Output } from 'ai'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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

// Structured generation: forces a schema-valid object so we never get
// silently-empty / unparseable JSON the way free-text parsing did.
async function generateStructured<T>(
  prompt: string,
  schema: z.ZodType<T>,
  maxTokens = 2000,
): Promise<T> {
  const { experimental_output } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    maxOutputTokens: maxTokens,
    prompt,
    experimental_output: Output.object({ schema }),
  })
  return experimental_output as T
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
        const prompt = `Analyze this ${mealType} for a D1 gymnast and estimate macros in grams. Meal: "${description}". Give a one-sentence piece of feedback.`
        const macros = await generateStructured(
          prompt,
          z.object({
            protein: z.number().describe('grams of protein'),
            carbs: z.number().describe('grams of carbohydrates'),
            fats: z.number().describe('grams of fat'),
            note: z.string().describe('one short sentence of feedback'),
          }),
        )
        return NextResponse.json({
          protein: Math.round(Number(macros.protein) || 0),
          carbs: Math.round(Number(macros.carbs) || 0),
          fats: Math.round(Number(macros.fats) || 0),
          note: macros.note || '',
        })
      }

      case 'skill-analysis': {
        const { skillName, event, entry } = payload
        const prompt = `Temple practiced the skill "${skillName}" on ${event}. Her free-text practice log: "${entry}". Structure this into coaching feedback.`
        const json = await generateStructured(
          prompt,
          z.object({
            went_well: z.string(),
            needs_work: z.string(),
            coach_feedback: z.string().describe('short actionable cue'),
            pattern: z.string().describe('short observed pattern'),
          }),
        )
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
