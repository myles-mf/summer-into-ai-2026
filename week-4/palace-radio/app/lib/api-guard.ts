/** Shared guard for every /api route — same shape as week-1/founding-father's
 * api/chat.js: same-origin check + a best-effort in-memory per-IP rate limit.
 * The real backstop is the OpenAI account spend cap (set in the dashboard). */
import { NextRequest } from 'next/server'

const hits = new Map<string, number[]>()

export function rateLimited(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs)
  arr.push(now)
  hits.set(ip, arr)
  return arr.length > max
}

export function sameOrigin(req: NextRequest): boolean {
  const host = req.headers.get('host') || ''
  const origin = req.headers.get('origin') || ''
  return !origin || origin.includes(host) || origin.includes('localhost') || origin.includes('127.0.0.1')
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') || 'anon').split(',')[0].trim()
}
