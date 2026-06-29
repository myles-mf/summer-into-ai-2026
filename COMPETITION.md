# Summer Into AI 2026 — Competition #2 · Shared Reference

> The reusable playbook for **every week**. Per-week builds live in `week-N/` (committed).
> **Post drafts live in `posts/week-N/` — that whole folder is gitignored and never committed.**
> Host: **Eric / @advisoryhour** on Substack · Source post: *"Summer Into AI: Are You Ready to Cook"*
> Cadence: a new **theme drops Monday**, submissions due **before Sunday (local midnight)**.

---

## 1. What counts as a valid submission

A scored entry **must** have all three:

1. **Build artifact** — a project, tool, game, prototype, video, etc.
2. **Public explanation** — a public post (Substack / LinkedIn / YouTube / blog).
3. **Working proof** — a **public live demo** *or* **shared code**.
   - > *"No demo and no code means the submission is not scored."*
   - A post **with no proof is not scored**, no matter how good.

Other rules:
- **Multiple submissions per week are allowed.**
- Complexity earns nothing on its own — **visible proof does.**
- GitHub isn't mandatory; wider AI tools are accepted.

## 2. Scoring

```
Total = Base Publishing Points + Proof Points + Bonus Points
```
(Exact point values aren't published, but the categories are confirmed.)

**Bonuses:**
| Bonus | How to earn it | Notes |
|---|---|---|
| **Theme alignment** | Build clearly responds to the week's theme | — |
| **Competitor reference** | Meaningfully reference another competitor's work | **Max 1 per submission** |
| **First submission** | Be the first valid submission that week | One per week — race for it |

**Tiebreakers, in order:**
1. Most weeks with a valid submission
2. Most public demos
3. Most competitor references
4. Public random tiebreaker

**Prizes / penalty:** Top 3 get medals / visible recognition. Zero submissions in a week = *"owes Eric a beer."*

## 3. How to enter (every week)

Write a public post and **tag @advisoryhour**, including:
- Project **title**
- **Description**
- **Theme connection** (how it fits the week's theme)
- **Proof links** (live demo and/or code)
- **Competitor reference(s)** (optional, for the bonus — max 1 scores)

---

## 4. Reusable weekly checklist

- [ ] Read the week's theme (drops Monday).
- [ ] Pick a **small, finishable** build — *small shipped beats ambitious unfinished.*
- [ ] **Differentiate**: ship a different *shape* than the crowd (the field skews to arcade mini-games + AI videos).
- [ ] Build the artifact (keep it self-contained where possible — one file = both proofs).
- [ ] Get **both** proofs where you can (live demo **and** public code → stronger + helps the "most public demos" tiebreaker).
- [ ] Draft the post in `posts/week-N/SUBMISSION.md` (gitignored — stays local).
- [ ] Deploy: commit `week-N/` and push; the live demo is at `https://myles-mf.github.io/summer-into-ai-2026/week-N/`.
- [ ] Write the post, tag **@advisoryhour**, include all 5 fields above.
- [ ] Reference **one** competitor meaningfully (bonus).
- [ ] **Publish before Sunday midnight.**

## 5. Strategy notes (carry across weeks)

- **Consistency wins the tiebreakers.** Showing up every week with a live demo beats one big entry. Never skip a week.
- **Always ship a live demo**, not just code — tiebreaker #2 is "most public demos."
- **Chase the first-submission bonus**: it's the one bonus you can lock by *speed*. Build the instant the Monday theme drops and publish first.
- **Reference a competitor every week** (tiebreaker #3 + bonus + goodwill from the judge). Riffing on someone's build is explicitly rewarded (Eric's own "Building on Paul Revere" did this).
- **Be the hub, not just a toy** when you can — builds others link back to get you referenced.

## 6. Theme log

| Week | Dates | Theme | Our build | Status |
|---|---|---|---|---|
| 1 | Mon Jun 15 → Sun Jun 21, 2026 | **8-Bit America** | **3 entries — all Published ✅** · (a) **Game of Liberty** — territory-battle game (`week-1/`); (b) **Liberty Chiptune** — 8-bit anthem maker (`week-1/anthem/`); (c) **Founding Father A.I.** — real-LLM chat (`week-1/founding-father/`, deployed on Vercel) | All on merlinforge.substack.com; all tag @advisoryhour. Competitor refs across posts: Adam's Paul Revere, Megaman 1776, Timestorm Baseball, British Kraken |
| 2 | Jun 22 → Jun 28 | **Independence Engines** ("Red, White, Boom!") — *"independence is not just a symbol…it's a mechanic."* | **8 builds.** (h) **Perpetual Union** (`week-2/perpetual-union/`) — the graphics finale: a real-time **GPU particle system** — **~1,048,576 (1024²) agents** on WebGL2 (ping-pong float textures, MRT update, additive points, HDR mip-bloom). Each particle springs toward its target in a **waving flag** with curl shimmer; **drag to scatter** them into chaos and they **re-form on their own** — out of many, one, and the one survives being torn apart. Verified headlessly via `window.__field` (compile-clean, form→scatter→reform confirmed); desktop+mobile (scale fits portrait), graceful WebGL2/float fallback. NOTE: superseded an earlier 3D-volumetric-Physarum attempt ("Continental") that came out blobby/unreadable at browser-feasible volume resolution (96³) — lesson: delicate slime-mold beauty needs high-res 2D, not low-res 3D volume; a recognizable emblem (flag) reads as "cool" far more reliably than an abstract 3D cloud. (g) **Sovereign** (`week-2/sovereign/`) — independence as **real cryptography / self-sovereignty**. 13 colonies each generate an **ECDSA P-256** keypair (genuine Web Crypto, in-browser, no server) and **sign** a ratification block chained by SHA-256 into one **tamper-evident** record; tamper any colony's signed words and that seal + everything downstream is rejected, with no central authority — verified by math. "Become a sovereign" lets you keygen + sign your own declaration and watch verification flip to FORGED when you edit a char. Built into the one dimension nobody in the field touched (security/crypto). Verified headlessly (`window.__sov`): real sign/verify roundtrip + tamper-reject + wrong-key-reject; 13-block chain builds valid, forgery at colony i breaks i..12 and heals. (f) **Emergent Revolution** (`week-2/emergent-revolution/`) — final-day push: 13 colonies = 13 from-scratch **Q-learning agents** (no libs/LLM/cloud) playing a repeated stag-hunt vs the Crown; each LEARNS from payoffs whether to stay loyal (taxed) or revolt (crushed if alone, free + trading if coordinated; the Crown's reach decays as revolt spreads). Independence is an **emergent learned equilibrium**, not scripted — verified headlessly (`window.__sim`): sharp phase transition (loyalist ≤~0.6 tax → revolution ≥~0.7; Retaliation & Trade also move the boundary), learning curve rises early→late, and **freeze-learning ⇒ 0/13 ever convinced** (the proof it's learned, not faked). Real 1773 Committees-of-Correspondence long-range edges (MA↔VA, NY↔SC, PA↔GA). Competitor ref = Jake's *Drafted*/*The Convention* (he staged/LLM-debated the founding; ours lets colonies rediscover it). (e) **Self-Evident** (`week-2/self-evident/`) — the flagship: a real char-level **GPT hand-written from scratch in one file** (token+positional embeddings, causal multi-head attention, **hand-written backprop**, AdamW — no libraries, no API), trained **live in the browser** (in a Web Worker) on the founding documents. Starts as noise → teaches itself 1776 cadence while you watch; live loss curve, frozen-twin contrast, attention heatmap. Backprop **verified by a numerical gradient check** (0.04% error) + held-out loss confirms real generalization. Theme = independence as *self-origination* (no pretrained ancestors, no cloud). Built to out-flank the host's own *Qwen Franklin* on instant-demoability. **4 builds (a–d):** (a) **Dependency Day** (`week-2/`) — systems/strategy puzzle: cut the Crown's supply lines so colonies disconnect and independence *cascades*; secure free clusters before the Crown re-garrisons. (b) **SOLO** (`week-2/solo/`) — an in-browser AI that learns to fly; neural net (forward + backprop + neuroevolution) **hand-written from scratch, no libraries**; behavioral cloning + DAgger and a no-teacher *Evolve From Scratch* path; live network viz. ~91% (cloning) / ~95% (evolution) autonomous win on *unseen* courses. (c) **Murmuration** (`week-2/murmuration/`) — emergence sim: a leaderless starling flock where order rises bottom-up. A dial blends **decentralized ↔ one Crown**; striking a node proves the thesis — *decentralized retains ~99% coherence; Crown rule collapses to ~40–47% once its single point of control is struck.* (d) **Liberty Engine** (`week-2/liberty-engine/`) — generative audio (Web Audio, no libraries): six **independent voices**, each on its own loop length (4/6/8/12/16 beats, LCM 48 → ever-evolving); mute/solo any and the rest play on. Seeded + shareable by URL. | ⚡ Entry #1 (Dependency Day) shipped first for the first-submission bonus + published; SOLO published Jun 23. **Murmuration + Liberty Engine = stacking entries #3/#4**, built into deliberately **open lanes** (emergence + audio) after scouting confirmed rivals cluster on shooters / fireworks / runners. Each is a *different shape* than the field; both verified headlessly. |

## 7. Competitor watch (seen so far)

- **Eric (@advisoryhour)** — Megaman 1776 ("Liberty or Death"), 8-bit Paul Revere AI video, Timestorm Baseball, Parade Candy Chaos, Pixelated British Kraken video.
- **Adam** — playable **Paul Revere arcade game** (live demo).
- *(add new competitors + their entries here each week — good reference-bonus targets.)*

## 8. Links

- Competition post: https://advisoryhour.substack.com/p/summer-into-ai-are-you-ready-to-cook
- Host profile: https://substack.com/@advisoryhour
