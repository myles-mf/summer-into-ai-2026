'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import PalaceScene, { type PalaceSceneHandle } from '../components/PalaceScene'
import { getPalace, savePalace, wingCount, type StoredPalace } from '../lib/palace-library'
import { claimHouse, type ClaimedNode } from '../lib/claim'
import { getTemplate } from '../lib/house'
import type { Association } from '../lib/palace'
import { encodeBroadcast, type DecoderEntry } from '../lib/cipher'
import { decodeLines, playSequence, stitchToWav, downloadBlob, type PlaybackHandle } from '../lib/audio-engine'

type Mode = 'plain' | 'cipher'
type Phase = 'idle' | 'tuning' | 'playing' | 'done'

const INTRO = "Transmission opening. This is the Keeper. Let's walk the house."
const OUTRO = "That's the last spot. Transmission complete."

function buildScript(claimed: ClaimedNode[], mode: Mode) {
  // Display associations use the CLAIMED PROP's own name as the locus, not
  // the original AI-generated word — those can differ once claiming falls
  // back to "next unclaimed spot," and the room only knows its own names.
  const display: Association[] = claimed.map((c) => ({
    locus: c.prop.id,
    item: c.association.item,
    sentence: c.association.sentence,
    emoji: c.association.emoji,
  }))

  if (mode === 'cipher') {
    const { spoken, decoder } = encodeBroadcast(display)
    const lineProp: (string | null)[] = [null, ...claimed.map((c) => c.prop.id), null]
    return { spoken, decoder, lineProp }
  }
  const spoken = [INTRO, ...display.map((a) => `At the ${a.locus}. ${a.sentence}.`), OUTRO]
  const lineProp: (string | null)[] = [null, ...claimed.map((c) => c.prop.id), null]
  return { spoken, decoder: [] as DecoderEntry[], lineProp }
}

function RadioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const wing = parseInt(searchParams.get('wing') ?? '0', 10) || 0

  const [palace, setPalace] = useState<StoredPalace | null>(null)
  const [mode, setMode] = useState<Mode>('plain')
  const [spatial, setSpatial] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [lineIndex, setLineIndex] = useState(-1)
  const [decoderOpen, setDecoderOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const sceneRef = useRef<PalaceSceneHandle>(null)
  const playbackRef = useRef<PlaybackHandle | null>(null)
  const buffersRef = useRef<AudioBuffer[]>([])

  useEffect(() => {
    const encoded = searchParams.get('p')
    if (encoded) {
      try {
        const json = atob(decodeURIComponent(encoded))
        const data = JSON.parse(json) as StoredPalace
        if (data.id && data.associations?.length && data.loci?.length) {
          // Upsert into the recipient's OWN library rather than clobbering
          // whatever palace they already had loaded -- this matters once
          // multiple palaces exist (it didn't when there was only one slot).
          savePalace(data)
          setPalace(getPalace(data.id))
          setMode(searchParams.get('mode') === 'cipher' ? 'cipher' : 'plain')
          return
        }
      } catch (_) {
        /* invalid payload, fall through */
      }
    }
    if (!id) {
      router.replace('/')
      return
    }
    const p = getPalace(id)
    if (!p || !p.associations.length) {
      router.replace('/')
      return
    }
    setPalace(p)
  }, [id, router, searchParams])

  const template = palace ? getTemplate(palace.templateId) : null
  const claimed: ClaimedNode[] = useMemo(
    () => (palace && template ? claimHouse(palace.associations, template, wing) : []),
    [palace, template, wing]
  )
  const script = useMemo(() => (claimed.length ? buildScript(claimed, mode) : null), [claimed, mode])

  async function startBroadcast() {
    if (!palace || !script) return
    setError(null)
    setPhase('tuning')
    setProgress({ done: 0, total: script.spoken.length })
    try {
      const buffers = await decodeLines(script.spoken, (done, total) => setProgress({ done, total }))
      buffersRef.current = buffers
      setPhase('playing')
      const posByProp = new Map(claimed.map((c) => [c.prop.id, c.prop.position]))
      const cues = script.lineProp.map((propId) => {
        const pos = propId ? posByProp.get(propId) : undefined
        return { position: pos ? ([pos[0], 1, pos[1]] as [number, number, number]) : ([0, 1, 0] as [number, number, number]) }
      })
      playbackRef.current = playSequence(buffers, cues, {
        spatial,
        onLineStart: (i) => {
          setLineIndex(i)
          const propId = script.lineProp[i]
          sceneRef.current?.setActive(propId)
          sceneRef.current?.flyTo(propId)
        },
        onDone: () => {
          setPhase('done')
          setLineIndex(-1)
          sceneRef.current?.setActive(null)
          sceneRef.current?.flyTo(null)
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The signal could not be reached')
      setPhase('idle')
    }
  }

  function stopBroadcast() {
    playbackRef.current?.stop()
    setPhase('idle')
    setLineIndex(-1)
    sceneRef.current?.setActive(null)
    sceneRef.current?.flyTo(null)
  }

  function downloadBroadcast() {
    if (!buffersRef.current.length) return
    const blob = stitchToWav(buffersRef.current)
    downloadBlob(blob, `palace-radio-broadcast.wav`)
  }

  function copyBroadcastLink() {
    if (!palace) return
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(palace))))
    let url = `${window.location.origin}/radio?id=${palace.id}&wing=${wing}&p=${encodeURIComponent(encoded)}`
    if (mode === 'cipher') url += '&mode=cipher'
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  if (!palace || !script || !template) {
    return <main className="min-h-screen flex items-center justify-center text-[var(--fg-dim)]">Tuning…</main>
  }

  const wings = wingCount(palace.itemCount)

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <div className="relative h-[52vh] md:h-screen flex-1">
        <PalaceScene ref={sceneRef} claimed={claimed} template={template} palaceId={palace?.id} />
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
          <Link href="/" className="text-xs text-[var(--fg-dim)] hover:text-[var(--amber)]">
            ← Palace Radio
          </Link>
        </div>
        {lineIndex >= 0 && (
          <div className="absolute bottom-4 left-4 right-4 panel crt px-4 py-3 max-w-xl">
            <p className="text-xs uppercase tracking-widest text-[var(--teal)]">on air</p>
            <p className="mt-1 text-sm">{script.spoken[lineIndex]}</p>
          </div>
        )}
      </div>

      <aside className="panel crt w-full md:w-96 p-6 flex flex-col">
        <span className="kicker">{palace.name}</span>
        <h1 className="headline text-2xl mt-3">On the Air</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">
          One broadcast: the Keeper walks every claimed spot in order, in a real voice — downloadable, shareable.
        </p>

        {wings > 1 && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-[var(--fg-dim)]">wing</span>
            {Array.from({ length: wings }, (_, w) => (
              <Link
                key={w}
                href={`/radio?id=${palace.id}&wing=${w}`}
                className={`border px-2 py-1 ${
                  w === wing ? 'border-[var(--amber)] text-[var(--amber)]' : 'border-[var(--line)] text-[var(--fg-dim)]'
                }`}
              >
                {w + 1}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <div className="flex border border-[var(--line)]">
            {(['plain', 'cipher'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                disabled={phase !== 'idle'}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wide ${mode === m ? 'bg-[var(--amber)] text-[var(--void)]' : 'text-[var(--fg-dim)]'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[var(--fg-dim)]">
            <input type="checkbox" checked={spatial} onChange={(e) => setSpatial(e.target.checked)} disabled={phase !== 'idle'} />
            spatial (headphones)
          </label>
        </div>

        <div className="mt-6">
          {phase === 'idle' && (
            <button type="button" onClick={startBroadcast} className="btn w-full">
              ▸ Start Palace Radio
            </button>
          )}
          {phase === 'tuning' && (
            <p className="text-sm text-[var(--teal)]">tuning in… {progress.done}/{progress.total}</p>
          )}
          {phase === 'playing' && (
            <button type="button" onClick={stopBroadcast} className="btn btn--ghost w-full">
              ■ Stop
            </button>
          )}
          {phase === 'done' && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--amber)]">Transmission complete.</p>
              <button type="button" onClick={startBroadcast} className="btn w-full">
                ▸ Play again
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-[var(--redact)]">{error}</p>}
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--line)] space-y-2">
          <button
            type="button"
            onClick={downloadBroadcast}
            disabled={!buffersRef.current.length}
            className="btn btn--teal w-full !text-xs"
          >
            ⬇ Download broadcast (.wav)
          </button>
          <button type="button" onClick={copyBroadcastLink} className="btn btn--ghost w-full !text-xs">
            {linkCopied ? 'Copied!' : 'Copy broadcast link'}
          </button>
        </div>

        {mode === 'cipher' && script.decoder.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[var(--line)]">
            <button type="button" onClick={() => setDecoderOpen(!decoderOpen)} className="text-xs text-[var(--amber)]">
              {decoderOpen ? '▼' : '▶'} decoder
            </button>
            {decoderOpen && (
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="text-[var(--fg-dim)] text-left">
                    <th className="pb-1">code</th>
                    <th className="pb-1">spot</th>
                    <th className="pb-1">item</th>
                  </tr>
                </thead>
                <tbody>
                  {script.decoder.map((d, i) => (
                    <tr key={i} className="border-t border-[var(--line)]">
                      <td className="py-1 text-[var(--amber)]">{d.code}</td>
                      <td className="py-1 text-[var(--fg-dim)]">{d.locus}</td>
                      <td className="py-1">{d.emoji ? d.emoji + ' ' : ''}{d.item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="mt-auto pt-6 flex gap-2">
          <Link href={`/palace?id=${palace.id}&wing=${wing}`} className="btn btn--ghost !text-xs">
            Explore
          </Link>
          <Link href={`/quiz?id=${palace.id}&wing=${wing}`} className="btn btn--ghost !text-xs">
            Quiz
          </Link>
        </div>
      </aside>
    </main>
  )
}

export default function RadioPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-[var(--fg-dim)]">Tuning…</main>}>
      <RadioContent />
    </Suspense>
  )
}
