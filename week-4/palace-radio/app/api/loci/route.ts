import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimited, sameOrigin, clientIp } from '@/app/lib/api-guard'

const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS ?? '300', 10)

/** POST { image: "data:image/jpeg;base64,..." } => { loci: string[] }
 * The photo is used only to personalize the locus labels — the 3D scene
 * renders an abstract beacon ring, not a reconstruction of the room, so we
 * don't ask the vision model for pixel bounding boxes anymore. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  if (rateLimited(clientIp(req))) return NextResponse.json({ error: 'Too many requests — pause a moment.' }, { status: 429 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })

  let body: { image?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dataUrl = body.image?.trim()
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return NextResponse.json({ error: 'image (data URL) is required' }, { status: 400 })
  }

  const openai = new OpenAI({ apiKey })
  const prompt = `Look at this room photo. Identify 4 to 6 distinct objects or areas that would work as memory "loci" (spots to attach memories): e.g. door, desk, window, bed, shelf, chair, lamp, table, bookshelf, mirror. Use short lowercase labels. Return valid JSON only: {"loci": ["label1", "label2", ...]}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return NextResponse.json({ error: 'No response from the vision model' }, { status: 502 })

    const parsed = JSON.parse(raw) as { loci?: string[] }
    const loci = Array.isArray(parsed.loci)
      ? parsed.loci.slice(0, 6).map((l) => String(l).toLowerCase().trim()).filter(Boolean)
      : []
    if (loci.length === 0) return NextResponse.json({ error: 'No loci detected in that photo' }, { status: 502 })

    return NextResponse.json({ loci })
  } catch (err) {
    console.error('Loci API error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Vision request failed' }, { status: 500 })
  }
}
