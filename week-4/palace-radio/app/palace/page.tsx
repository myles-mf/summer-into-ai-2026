'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PalaceScene, { type PalaceSceneHandle } from '../components/PalaceScene'
import { loadPalace, type PalaceState } from '../lib/palace'
import { claimHouse, type ClaimedNode } from '../lib/claim'
import { HOUSE_PROPS } from '../lib/house'
import { decodeLine, playSequence, type PlaybackHandle } from '../lib/audio-engine'

export default function PalacePage() {
  const router = useRouter()
  const [palace, setPalace] = useState<PalaceState | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [voicing, setVoicing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const sceneRef = useRef<PalaceSceneHandle>(null)
  const playbackRef = useRef<PlaybackHandle | null>(null)

  useEffect(() => {
    const p = loadPalace()
    if (!p || !p.associations.length) {
      router.replace('/create')
      return
    }
    setPalace(p)
  }, [router])

  const claimed: ClaimedNode[] = useMemo(() => (palace ? claimHouse(palace.associations) : []), [palace])

  function select(propId: string) {
    setSelected(propId)
    sceneRef.current?.setActive(propId)
    sceneRef.current?.flyTo(propId)
  }

  async function hearThis() {
    if (!selected || !palace) return
    const node = claimed.find((c) => c.prop.id === selected)
    if (!node) return
    setVoiceError(null)
    setVoicing(true)
    try {
      const buf = await decodeLine(`At the ${node.prop.id}. ${node.association.sentence}.`)
      playbackRef.current?.stop()
      playbackRef.current = playSequence([buf], [{}], { onDone: () => setVoicing(false) })
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'The signal failed')
      setVoicing(false)
    }
  }

  if (!palace) return <main className="min-h-screen flex items-center justify-center text-[var(--fg-dim)]">Loading…</main>

  const active = selected ? claimed.find((c) => c.prop.id === selected) : null

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <div className="relative h-[52vh] md:h-screen flex-1">
        <PalaceScene ref={sceneRef} claimed={claimed} onPick={(id) => select(id)} />
        <div className="absolute top-4 left-4">
          <Link href="/" className="text-xs text-[var(--fg-dim)] hover:text-[var(--amber)]">
            ← Palace Radio
          </Link>
        </div>
        <div className="absolute bottom-4 left-4 text-[10px] uppercase tracking-widest text-[var(--fg-dim)]">
          WASD to walk · drag to look · click a glowing spot
        </div>
      </div>

      <aside className="panel crt w-full md:w-96 p-6 flex flex-col">
        <span className="kicker">The Station House</span>
        <h1 className="headline text-2xl mt-3">Explore</h1>
        <p className="mt-1 text-xs text-[var(--fg-dim)]">
          {claimed.length} of {HOUSE_PROPS.length} spots claimed — the rest of the house is just furniture.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {claimed.map((c) => (
            <button
              key={c.prop.id}
              type="button"
              onClick={() => select(c.prop.id)}
              className={`border px-2.5 py-1 text-xs uppercase tracking-wide transition ${
                selected === c.prop.id
                  ? 'border-[var(--teal)] text-[var(--teal)]'
                  : 'border-[var(--line)] text-[var(--fg-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)]'
              }`}
            >
              {c.prop.id}
            </button>
          ))}
        </div>

        <div className="mt-6 flex-1">
          {active ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--fg-dim)]">Spot: {active.prop.id}</p>
              <p className="mt-1 text-xl font-bold text-[var(--amber)]">{active.association.item}</p>
              <p className="mt-3 text-sm italic text-[var(--fg-dim)]">&ldquo;{active.association.sentence}&rdquo;</p>
              <button type="button" onClick={hearThis} disabled={voicing} className="btn btn--teal mt-4 !text-xs">
                {voicing ? '♪ playing…' : '♪ hear this'}
              </button>
              {voiceError && <p className="mt-2 text-xs text-[var(--redact)]">{voiceError}</p>}
            </div>
          ) : (
            <p className="text-sm text-[var(--fg-dim)]">Click a glowing spot (or a word above) to tune in.</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 pt-6 border-t border-[var(--line)]">
          <Link href="/radio" className="btn">
            ▸ Tune in to Palace Radio
          </Link>
          <Link href="/quiz" className="btn btn--ghost">
            Take the quiz
          </Link>
        </div>
      </aside>
    </main>
  )
}
