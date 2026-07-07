'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PalaceScene, { type PalaceSceneHandle } from '../components/PalaceScene'
import { loadPalace, type PalaceState } from '../lib/palace'
import { layoutRoom } from '../lib/nodes'
import { decodeLine, playSequence, type PlaybackHandle } from '../lib/audio-engine'

export default function PalacePage() {
  const router = useRouter()
  const [palace, setPalace] = useState<PalaceState | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
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

  const nodes = useMemo(() => (palace ? layoutRoom(palace.loci) : []), [palace])

  function select(index: number) {
    setSelected(index)
    sceneRef.current?.setActive(index)
    sceneRef.current?.flyTo(index)
  }

  async function hearThis() {
    if (selected === null || !palace) return
    const a = palace.associations[selected]
    setVoiceError(null)
    setVoicing(true)
    try {
      const buf = await decodeLine(`At the ${a.locus}. ${a.sentence}.`)
      playbackRef.current?.stop()
      playbackRef.current = playSequence([buf], [{}], { onDone: () => setVoicing(false) })
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'The signal failed')
      setVoicing(false)
    }
  }

  if (!palace) return <main className="min-h-screen flex items-center justify-center text-[var(--fg-dim)]">Loading…</main>

  const active = selected !== null ? palace.associations[selected] : null

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <div className="relative h-[52vh] md:h-screen flex-1">
        <PalaceScene
          ref={sceneRef}
          nodes={nodes}
          onPick={(i) => select(i)}
        />
        <div className="absolute top-4 left-4">
          <Link href="/" className="text-xs text-[var(--fg-dim)] hover:text-[var(--amber)]">
            ← Palace Radio
          </Link>
        </div>
        <div className="absolute bottom-4 left-4 text-[10px] uppercase tracking-widest text-[var(--fg-dim)]">
          WASD to walk · drag to look · click a beacon
        </div>
      </div>

      <aside className="panel crt w-full md:w-96 p-6 flex flex-col">
        <span className="kicker">The Station</span>
        <h1 className="headline text-2xl mt-3">Explore</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {palace.loci.map((locus, i) => (
            <button
              key={locus + i}
              type="button"
              onClick={() => select(i)}
              className={`border px-2.5 py-1 text-xs uppercase tracking-wide transition ${
                selected === i ? 'border-[var(--teal)] text-[var(--teal)]' : 'border-[var(--line)] text-[var(--fg-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)]'
              }`}
            >
              {locus}
            </button>
          ))}
        </div>

        <div className="mt-6 flex-1">
          {active ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--fg-dim)]">Beacon: {active.locus}</p>
              <p className="mt-1 text-xl font-bold text-[var(--amber)]">{active.item}</p>
              <p className="mt-3 text-sm italic text-[var(--fg-dim)]">&ldquo;{active.sentence}&rdquo;</p>
              <button type="button" onClick={hearThis} disabled={voicing} className="btn btn--teal mt-4 !text-xs">
                {voicing ? '♪ playing…' : '♪ hear this'}
              </button>
              {voiceError && <p className="mt-2 text-xs text-[var(--redact)]">{voiceError}</p>}
            </div>
          ) : (
            <p className="text-sm text-[var(--fg-dim)]">Click a glowing beacon (or a locus above) to tune in.</p>
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
