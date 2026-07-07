# Palace Radio — deploy on Vercel (key stays server-side)

This is a full Next.js app (not a static page) so it needs to run on **Vercel**,
not GitHub Pages. Your OpenAI key lives only as a Vercel **Environment Variable** —
never in the code, never in this repo, never sent to the browser.

## One-time setup (~10 min)

1. **Set a spend cap first.** platform.openai.com → **Settings → Limits** → set a
   hard monthly usage limit (e.g. $10 — this build calls both `gpt-4o-mini` for
   text/vision and `gpt-4o-mini-tts` for the Keeper's voice, so it costs a bit
   more per use than a text-only chat proxy).

2. **Import the repo into Vercel.** vercel.com → **Add New → Project** → import
   `myles-mf/summer-into-ai-2026`.
   - Set **Root Directory** to `week-4/palace-radio`.
   - Framework preset: **Next.js** (auto-detected).

3. **Add the key.** Project → **Settings → Environment Variables** → add:
   - `OPENAI_API_KEY` — your OpenAI key. Apply to Production (and Preview).
   - Optional: `KEEPER_VOICE` (default `onyx`) — any OpenAI TTS voice name.
   - Optional: `AI_MAX_TOKENS` (default `512`/`300` depending on the route).

4. **Deploy.** Vercel builds it and gives you a URL like
   `https://palace-radio-xyz.vercel.app`. That URL is your **proof link** —
   update the Week 4 card in the root `index.html` (and the Substack/merlinforge
   posts) to point at it once you have it.

5. Future pushes to `main` auto-redeploy.

## What's protected
- Key is a server-only env var (never in client/repo).
- Every route (`/api/loci`, `/api/associations`, `/api/tts`) checks same-origin
  and applies a best-effort per-IP rate limit — see `app/lib/api-guard.ts`.
- `/api/tts` caps input to 400 characters per call; the client caches each line's
  audio by exact text so a broadcast only ever pays for each line once, even on
  replay or when a shared link is opened.
- **The account spend cap is the real backstop**, same as `week-1/founding-father`.

## Local dev
```
cd week-4/palace-radio
npm install
OPENAI_API_KEY=sk-... npm run dev
```
Without a key set, the app still runs — every AI-backed action (generating
associations, reading a room photo, the Keeper's voice) surfaces a clear
"OPENAI_API_KEY is not set" error instead of crashing.
