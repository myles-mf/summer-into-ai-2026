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
| 2 | Jun 22 → Jun 28 | **Independence Engines** ("Red, White, Boom!") — *"independence is not just a symbol…it's a mechanic."* | **2 builds.** (a) **Dependency Day** (`week-2/`) — systems/strategy puzzle: cut the Crown's supply lines so colonies disconnect and independence *cascades*; secure free clusters (2+ free neighbors) to lock them permanently before the Crown re-garrisons. (b) **SOLO** (`week-2/solo/`) — an in-browser AI that learns to fly, with the neural net (forward + backprop + neuroevolution) **hand-written from scratch, no libraries**. Two learning paths: (i) *behavioral cloning* — it learns from the player's piloting, then "cuts the cord" and flies an *unseen* course solo, with DAgger-style coaching; (ii) *self-taught* — **Evolve From Scratch**: a population learns to fly with **no teacher at all** (neuroevolution), the champion improving generation by generation on screen. Live network visualization. Verified headlessly: ~91% (cloning) / ~95% (evolution) autonomous win on *unseen* courses. | ⚡ Entry #1 (Dependency Day) shipped first for the first-submission bonus + published. SOLO = stacking entry #2 (the "above and beyond" big swing; user explicitly pushed for an ambitious build). |

## 7. Competitor watch (seen so far)

- **Eric (@advisoryhour)** — Megaman 1776 ("Liberty or Death"), 8-bit Paul Revere AI video, Timestorm Baseball, Parade Candy Chaos, Pixelated British Kraken video.
- **Adam** — playable **Paul Revere arcade game** (live demo).
- *(add new competitors + their entries here each week — good reference-bonus targets.)*

## 8. Links

- Competition post: https://advisoryhour.substack.com/p/summer-into-ai-are-you-ready-to-cook
- Host profile: https://substack.com/@advisoryhour
