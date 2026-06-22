# Founding Father A.I. — deploy on Vercel (key stays server-side)

This build needs a serverless function (`api/chat.js`), so it runs on **Vercel**,
not GitHub Pages. Your OpenAI key lives only as a Vercel **Environment Variable** —
never in the code, never in this repo, never sent to the browser.

## One-time setup (~10 min)

1. **Set a spend cap first.** platform.openai.com → **Settings → Limits** → set a
   hard monthly usage limit (e.g. $5). This is the real protection if the public
   demo gets abused.

2. **Import the repo into Vercel.** vercel.com → **Add New → Project** → import
   `myles-mf/summer-into-ai-2026`.
   - Set **Root Directory** to `week-1/founding-father`.
   - Framework preset: **Other** (it's static HTML + an `api/` function).

3. **Add the key.** Project → **Settings → Environment Variables** → add:
   - Name: `OPENAI_API_KEY`
   - Value: *(your OpenAI key — paste it here, in Vercel only)*
   - Apply to Production (and Preview).

4. **Deploy.** Vercel builds it and gives you a URL like
   `https://founding-father-xyz.vercel.app`. That URL is your **proof link** for
   the submission (the chat works there because the function runs there).

   > Note: the copy of this folder on GitHub Pages will load the UI but the
   > `/api/chat` call won't work (Pages has no functions) — always link the
   > **Vercel** URL.

5. Future pushes to `main` auto-redeploy.

## What's protected
- Key is a server-only env var (never in client/repo).
- Function caps `max_tokens` (~160) and trims history → bounded cost per call.
- Locked founder persona server-side + refusal instructions → proxy can't be
  hijacked as a general-purpose LLM.
- Same-origin check + light per-IP rate limit. **The spend cap is the backstop.**

## Model
OpenAI `gpt-4o-mini`. To swap models/providers, edit `api/chat.js`.
