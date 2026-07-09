import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimited, sameOrigin, clientIp } from '@/app/lib/api-guard'
import { TEMPLATE_LOCI } from '@/app/lib/palace'

const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS ?? '700', 10)

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  if (rateLimited(clientIp(req))) return NextResponse.json({ error: 'Too many requests — pause a moment.' }, { status: 429 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })

  let body: { topicOrList?: string; loci?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const topicOrList = body.topicOrList?.trim()
  const loci = (body.loci?.length ? body.loci : TEMPLATE_LOCI).slice(0, TEMPLATE_LOCI.length)
  if (!topicOrList) return NextResponse.json({ error: 'topicOrList is required' }, { status: 400 })

  const openai = new OpenAI({ apiKey })
  const prompt = `You are helping someone use the Memory Palace (Method of Loci). They want to remember: "${topicOrList}".

Use these locations as loci (in order): ${loci.join(', ')}.

For each locus, give one short, vivid, sensory association (one sentence) — visual or slightly silly so it's easy to recall. Output valid JSON only:
{"associations":[{"locus":"...","item":"...","sentence":"..."}, ...]}

Match the number of associations to the number of loci. If the user gave a list, assign each list item to a locus in order. If they gave a topic, break it into that many key items.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return NextResponse.json({ error: 'No response from the model' }, { status: 502 })

    const parsed = JSON.parse(raw) as { associations?: Array<{ locus: string; item: string; sentence: string }> }
    if (!Array.isArray(parsed.associations)) {
      return NextResponse.json({ error: 'Invalid response shape' }, { status: 502 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Associations API error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Request failed' }, { status: 500 })
  }
}
