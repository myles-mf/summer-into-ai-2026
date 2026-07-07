import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimited, sameOrigin, clientIp } from '@/app/lib/api-guard'

const MAX_CHARS = 400
const VOICE = process.env.KEEPER_VOICE || 'onyx' // deep, even voice for "the Keeper"

/** POST { text } => audio/mpeg bytes. Text is capped so a single call stays
 * cheap and bounded; the client caches by exact text so a broadcast only
 * ever pays for each line once. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  // Radio broadcasts fetch one line per locus in quick succession — a slightly
  // higher ceiling than the text routes, still bounded by the account spend cap.
  if (rateLimited(clientIp(req), 40)) {
    return NextResponse.json({ error: 'The signal is saturated — pause a moment.' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 })

  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const text = body.text?.trim().slice(0, MAX_CHARS)
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })

  try {
    const openai = new OpenAI({ apiKey })
    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: VOICE as any,
      input: text,
      response_format: 'mp3',
    })
    const buf = Buffer.from(await speech.arrayBuffer())
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('TTS API error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Voice request failed' }, { status: 500 })
  }
}
