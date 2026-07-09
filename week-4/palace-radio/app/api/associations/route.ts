import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimited, sameOrigin, clientIp } from '@/app/lib/api-guard'
import { templateLoci, DEFAULT_TEMPLATE_ID } from '@/app/lib/house'
import { PROPS_PER_WING } from '@/app/lib/palace-library'

const DEFAULT_LOCI = templateLoci(DEFAULT_TEMPLATE_ID)

const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS ?? '700', 10)

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  if (rateLimited(clientIp(req))) return NextResponse.json({ error: 'Too many requests — pause a moment.' }, { status: 429 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })

  let body: { topicOrList?: string; loci?: string[]; items?: string[]; excludeItems?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // `items` is a pre-split literal batch -- used when a palace is growing a
  // second (or third...) wing from an explicit list, so the client can ask
  // for "the next 16" as a literal list rather than fragile re-description
  // prose against the original topic string.
  const topicOrList = (body.items?.length ? body.items.join('; ') : body.topicOrList)?.trim()
  const loci = (body.loci?.length ? body.loci : DEFAULT_LOCI).slice(0, PROPS_PER_WING)
  if (!topicOrList) return NextResponse.json({ error: 'topicOrList is required' }, { status: 400 })

  const excludeClause = body.excludeItems?.length
    ? `\n\nDo not repeat any of these items, already covered elsewhere in this palace: ${body.excludeItems.join(', ')}.`
    : ''

  const openai = new OpenAI({ apiKey })
  const prompt = `You are helping someone use the Memory Palace (Method of Loci). They want to remember: "${topicOrList}".

Use these locations as loci (in order): ${loci.join(', ')}.

For each locus, give one short, vivid, sensory association (one sentence) — visual or slightly silly so it's easy to recall. Describe something ADDED to the scene at that spot (an object placed there, a creature perched on it, an action happening around it) rather than a change to the locus's own surface or material — avoid things like cracks in the door, a brand burned into the lamp, a stain on the shelf, since the room shows a plain, unaltered version of each piece of furniture and a described surface change won't match what's actually there. Also give one emoji that depicts the SPECIFIC vivid detail in your sentence, not a generic icon for the locus itself (a lightbulb sentence gets 💡, not 🚪 for the door it's hanging near). The emoji must accurately depict the exact thing you wrote about — never substitute a different creature or object just because it's easier to render (if your sentence says "cat", the emoji must be a cat, never a bird, even if 🐦 is on the list below and 🐈 isn't). When you're first deciding WHAT vivid detail to write about, you may lean toward something that naturally IS one of these (they render as an actual small 3D object in the room, not just an icon): 💡🎈🔋💎📦📖🐦🌙⭐🔥💧🔑🕯️🎵🧲🌵⚙️🔔 — but only when it's still a genuinely good, accurate fit for what you want the reader to picture; otherwise write whatever detail is most vivid and memorable and give it the accurate emoji even if that emoji isn't on this list (it still renders fine, just as a floating icon instead of a 3D object). Output valid JSON only:
{"associations":[{"locus":"...","item":"...","sentence":"...","emoji":"..."}, ...]}

Match the number of associations to the number of loci. If the user gave a list, assign each list item to a locus in order. If they gave a topic, break it into that many key items.${excludeClause}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return NextResponse.json({ error: 'No response from the model' }, { status: 502 })

    const parsed = JSON.parse(raw) as { associations?: Array<{ locus: string; item: string; sentence: string; emoji?: string }> }
    if (!Array.isArray(parsed.associations)) {
      return NextResponse.json({ error: 'Invalid response shape' }, { status: 502 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Associations API error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Request failed' }, { status: 500 })
  }
}
