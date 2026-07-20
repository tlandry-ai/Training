import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { buildPlanContext } from '@/lib/coach'
import { dateKey } from '@/lib/plan'

export const maxDuration = 30

const MODEL = 'anthropic/claude-sonnet-4.6'

// ---------- helpers ----------

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function metaTag(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      'i',
    ),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1]
  }
  return null
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

// ---------- route ----------

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  // Pull today's logged meals for personalized context.
  let loggedToday = 'No meals logged yet today.'
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase
      .from('food_log')
      .select('meal_type, fuel_read, ai_note, description, ai_protein, ai_carbs, ai_fats')
      .eq('date_key', dateKey(new Date()))
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      const totals = data.reduce(
        (a, m: any) => ({
          p: a.p + (m.ai_protein || 0),
          c: a.c + (m.ai_carbs || 0),
          f: a.f + (m.ai_fats || 0),
        }),
        { p: 0, c: 0, f: 0 },
      )
      const cals = totals.p * 4 + totals.c * 4 + totals.f * 9
      const lines = data
        .map(
          (m: any) =>
            `- ${m.meal_type || 'Meal'}: ${m.fuel_read || m.ai_note || m.description || ''} (${m.ai_protein || 0}P/${m.ai_carbs || 0}C/${m.ai_fats || 0}F)`,
        )
        .join('\n')
      loggedToday = `Logged today so far — ~${cals} cal, ${totals.p}g protein, ${totals.c}g carbs, ${totals.f}g fat:\n${lines}`
    }
  } catch {
    // Non-fatal — Josie just won't have today's log.
  }

  const system = `You are Coach Josie — Temple's personal trainer and nutrition coach. You are warm, encouraging, direct, and a little playful, exactly like the coach who wrote her plan. Talk to Temple like a friend who is also a pro. Keep replies concise and practical (usually a few short paragraphs or a tight list). Never use emojis.

Your job: help Temple stay on track with the plan below — answer questions about food, macros, recipes, swaps, workouts, form, and motivation. Always ground advice in HER specific plan and targets. When you suggest a recipe or meal, note roughly how it fits her macros (especially protein) and flag if it leans heavy on any macro.

RECIPE SOURCING TOOLS:
- If Temple pastes a link (TikTok, Instagram Reel, a blog, anything), call fetchRecipe with that URL to read what is publicly available, then reformat it into a clean ingredients list + steps, and adapt it to fit her plan (higher protein, approved foods, note macros).
- Honesty rule: TikTok and Instagram heavily restrict what is publicly readable. If a link returns only a caption/description or not much, say so plainly, use whatever you got, and offer to rebuild the recipe from the idea or search the web instead. Never invent what a specific video contained.
- If Temple asks you to FIND recipes (no link), call searchWeb, then optionally fetchRecipe on a promising result to get details.
- Prefer higher-protein, whole-food versions that use foods from her approved guide.

TEMPLE'S PLAN:
${buildPlanContext()}

TODAY'S LOG:
${loggedToday}

Today's date: ${new Date().toDateString()}.`

  const result = streamText({
    model: MODEL,
    system,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(6),
    tools: {
      fetchRecipe: tool({
        description:
          'Fetch a recipe or food-related web page (including TikTok/Instagram links) and return its publicly available text so you can reformat it. Use when the user pastes a URL.',
        inputSchema: z.object({
          url: z.string().describe('The full URL to fetch, including https://'),
        }),
        execute: async ({ url }) => {
          try {
            const html = await fetchPage(url)
            const title =
              metaTag(html, 'og:title') ||
              (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null)
            const description =
              metaTag(html, 'og:description') ||
              metaTag(html, 'description')
            const body = stripHtml(html).slice(0, 4000)
            const isSocial = /tiktok\.com|instagram\.com/i.test(url)
            return {
              url,
              title,
              description,
              isSocial,
              note: isSocial
                ? 'This is a TikTok/Instagram link. These platforms usually expose only the caption/description publicly — full video steps are typically not readable. Use what is here and be honest about the limitation.'
                : undefined,
              bodyText: body,
            }
          } catch (e: any) {
            return {
              url,
              error: `Could not read this page (${e?.message || 'unknown error'}). It may require login or block automated access — common with TikTok/Instagram. Offer to rebuild the recipe from the idea or to search the web instead.`,
            }
          }
        },
      }),

      searchWeb: tool({
        description:
          'Search the web for recipes or nutrition info. Returns top result titles, URLs, and snippets. Use when the user wants recipe ideas without a specific link.',
        inputSchema: z.object({
          query: z.string().describe('The search query, e.g. "high protein chicken poke bowl recipe"'),
        }),
        execute: async ({ query }) => {
          try {
            const html = await fetchPage(
              `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
            )
            const results: { title: string; url: string; snippet: string }[] = []
            const linkRe =
              /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
            const snippetRe =
              /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
            const snippets: string[] = []
            let sm: RegExpExecArray | null
            while ((sm = snippetRe.exec(html)) !== null) {
              snippets.push(stripHtml(sm[1]))
            }
            let lm: RegExpExecArray | null
            let i = 0
            while ((lm = linkRe.exec(html)) !== null && results.length < 6) {
              let href = lm[1]
              // DuckDuckGo wraps links in a redirect with uddg param
              const uddg = href.match(/[?&]uddg=([^&]+)/)
              if (uddg) href = decodeURIComponent(uddg[1])
              results.push({
                title: stripHtml(lm[2]),
                url: href,
                snippet: snippets[i] || '',
              })
              i++
            }
            if (results.length === 0) {
              return { query, results: [], note: 'No results parsed. Try suggesting recipes from your own knowledge that fit her macros.' }
            }
            return { query, results }
          } catch (e: any) {
            return {
              query,
              error: `Search failed (${e?.message || 'unknown'}). Suggest recipes from your own knowledge that fit her plan instead.`,
            }
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
