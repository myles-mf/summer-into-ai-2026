import { NextRequest, NextResponse } from 'next/server'
import { rateLimited, sameOrigin, clientIp } from '@/app/lib/api-guard'

/**
 * Proxy for Tripo3D text-to-3D generation (api.tripo3d.ai has no CORS, and
 * our key must never reach the browser -- same posture as /api/tts).
 *
 * POST { prompt, userKey? }        -> { taskId }
 * GET  ?taskId=...                 -> { status, glbUrl? }   (poll)
 * GET  ?download=<tripo url>      -> GLB bytes              (CDN proxy)
 *
 * Keys: a request with `userKey` (or `x-user-key` header on GET) runs on the
 * CALLER's Tripo account at their own cost -- passed through per-request,
 * never logged or stored. Without it we use TRIPO_API_KEY (our account),
 * gated by a per-IP daily quota here plus the real backstop: the account
 * holds a fixed prepaid credit pack with auto-refill OFF, so when the pack
 * is spent the free tier simply stops (Tripo has no per-key spend caps).
 */

const TRIPO_BASE = 'https://api.tripo3d.ai/v2/openapi'
const MAX_PROMPT_CHARS = 200
const OUR_KEY_DAILY_LIMIT = 12

// Best-effort in-memory daily ledger for OUR-key generations (per instance,
// resets on redeploy -- the credit pack is the hard limit, this just slows
// any single visitor down).
const daily = new Map<string, number[]>()

function overDailyQuota(ip: string): boolean {
  const now = Date.now()
  const arr = (daily.get(ip) || []).filter((t) => now - t < 24 * 60 * 60 * 1000)
  if (arr.length >= OUR_KEY_DAILY_LIMIT) return true
  arr.push(now)
  daily.set(ip, arr)
  return false
}

/** SSRF guard for the download proxy: only fetch URLs that are plainly
 * Tripo-owned. Their result files come off tripo3d.ai / tripo3d.com CDNs. */
function isTripoUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    return (
      u.hostname === 'tripo3d.ai' ||
      u.hostname.endsWith('.tripo3d.ai') ||
      u.hostname === 'tripo3d.com' ||
      u.hostname.endsWith('.tripo3d.com')
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  if (rateLimited(clientIp(req))) return NextResponse.json({ error: 'Too many requests — pause a moment.' }, { status: 429 })

  let body: { prompt?: string; userKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const prompt = body.prompt?.trim().slice(0, MAX_PROMPT_CHARS)
  if (!prompt) return NextResponse.json({ error: 'prompt is required' }, { status: 400 })

  const userKey = body.userKey?.trim()
  const apiKey = userKey || process.env.TRIPO_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TRIPO_API_KEY is not set' }, { status: 500 })

  if (!userKey && overDailyQuota(clientIp(req))) {
    return NextResponse.json(
      { error: 'The free sculpting quota is spent for today — add your own Tripo key to keep going.' },
      { status: 429 }
    )
  }

  try {
    const res = await fetch(`${TRIPO_BASE}/task`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'text_to_model', prompt, model_version: 'v3.1', texture: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = data?.message || data?.error || `Tripo error (${res.status})`
      return NextResponse.json({ error: message }, { status: 502 })
    }
    const taskId = data?.data?.task_id
    if (!taskId) return NextResponse.json({ error: 'No task id from Tripo' }, { status: 502 })
    return NextResponse.json({ taskId })
  } catch (err) {
    console.error('model-gen create error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation request failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  if (rateLimited(clientIp(req), 60)) return NextResponse.json({ error: 'Too many requests — pause a moment.' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const download = searchParams.get('download')

  if (download) {
    if (!isTripoUrl(download)) return NextResponse.json({ error: 'Refusing to fetch a non-Tripo URL' }, { status: 400 })
    try {
      const res = await fetch(download)
      if (!res.ok) return NextResponse.json({ error: `Model fetch failed (${res.status})` }, { status: 502 })
      const buf = Buffer.from(await res.arrayBuffer())
      return new NextResponse(buf, {
        status: 200,
        headers: { 'Content-Type': 'model/gltf-binary', 'Cache-Control': 'no-store' },
      })
    } catch (err) {
      console.error('model-gen download error:', err)
      return NextResponse.json({ error: 'Model download failed' }, { status: 500 })
    }
  }

  const taskId = searchParams.get('taskId')
  if (!taskId || !/^[a-zA-Z0-9-]+$/.test(taskId)) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  const userKey = req.headers.get('x-user-key')?.trim()
  const apiKey = userKey || process.env.TRIPO_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'TRIPO_API_KEY is not set' }, { status: 500 })

  try {
    const res = await fetch(`${TRIPO_BASE}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message = data?.message || data?.error || `Tripo error (${res.status})`
      return NextResponse.json({ error: message }, { status: 502 })
    }
    const task = data?.data
    const status: string = task?.status || 'unknown'
    // Result field naming has varied across Tripo API versions -- check the
    // known spellings rather than betting on one.
    const output = task?.output || {}
    const glbUrl: string | undefined = output.pbr_model || output.model || output.model_urls?.[0] || output.model_url
    if (status === 'success' && glbUrl) return NextResponse.json({ status: 'success', glbUrl })
    if (status === 'failed' || status === 'cancelled' || status === 'banned') {
      return NextResponse.json({ status: 'failed' })
    }
    return NextResponse.json({ status: 'running' })
  } catch (err) {
    console.error('model-gen poll error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Poll failed' }, { status: 500 })
  }
}
