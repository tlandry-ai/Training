import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const SYSTEM = `You are a personal training assistant for Temple Landry — a Stanford D1 gymnast, MS&E junior, and founder. You know her schedule: CorePower + lift + gym practice on Mon/Wed/Fri, Solid Core + PT + gym practice on Tue/Thu, work 9-6, runs Wed/Fri evenings. Be concise, warm, and direct. No fluff, no filler.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { action, data } = req.body

  const prompts = {
    'daily-brief': `Write a 2-3 sentence morning brief for Temple. Today (${data.dayName}): ${data.schedule?.join(', ') || 'rest day'}. Last 7 days: ${data.weekPct}% completion. Recent notes: "${data.recentNotes}". Be motivating and specific to today. Max 55 words.`,

    'meal-analysis': `Analyze this meal for a D1 gymnast on a ${data.isTrainingDay ? 'heavy training' : 'rest'} day: "${data.meal}". Reply ONLY with JSON, no markdown: {"protein":"Xg","carbs":"Xg","fats":"Xg","note":"one sentence on timing/alignment with training"}`,

    'skill-analysis': `Structure this gymnastics practice log for skill "${data.skillName}": "${data.entry}". ${data.recentEntries?.length ? `Recent entries: ${data.recentEntries.slice(-3).map(e=>e.entry).join(' | ')}` : ''}. Reply ONLY with JSON, no markdown: {"went_well":"...or null","needs_work":"...","coach_feedback":"...or null","pattern":"cross-entry pattern if visible, else null"}`,

    'weekly-review': `Weekly training review for Temple. Stats: ${data.sessionsDone} sessions done, ${data.pct}% completion, ${data.foodEntries} meals logged, ${data.skillEntries} practice entries. Notes this week: "${data.notes}". Write: 1 short paragraph summary, then "→ Next week: " one specific adjustment. Max 75 words total.`,

    'goal-nudge': `Temple's goals: ${data.goals?.map(g=>`"${g.title}" (${g.done?'done':'pending'})`).join(', ') || 'none'}. This week's activity: ${data.weekSummary}. Write ONE short nudge (1-2 sentences) about the most at-risk or relevant goal right now. Be specific, not generic.`,
  }

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM,
      prompt: prompts[action],
      maxTokens: 300,
    })
    res.status(200).json({ text })
  } catch(e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
