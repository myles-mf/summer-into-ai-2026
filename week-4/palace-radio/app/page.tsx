'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listPalaces, deletePalace, wingCount, type PalaceMeta } from './lib/palace-library'

const TEMPLATE_LABEL: Record<PalaceMeta['templateId'], string> = {
  'station-house': 'Station House',
  'broadcast-loft': 'Broadcast Loft',
  'greenhouse-archive': 'Greenhouse Archive',
}

export default function HomePage() {
  const [palaces, setPalaces] = useState<PalaceMeta[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    setPalaces(listPalaces())
  }, [])

  function handleDelete(id: string) {
    deletePalace(id)
    setPalaces(listPalaces())
    setConfirmingDelete(null)
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 halftone pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-24 crop-marks">
        <span className="kicker">Summer Into AI · Week 4 · Built on Yesterday</span>

        <h1 className="headline-hero text-6xl md:text-8xl mt-6 leading-[0.9]">
          Palace
          <br />
          Radio
        </h1>

        <p className="mt-6 text-lg text-[var(--fg-dim)] max-w-xl">
          Method of Loci, tuned to a signal. Put what you want to remember on a beacon in a
          3D memory station, then <span className="text-[var(--amber)]">tune in</span> as the
          Keeper reads it back — plain, spatial, or in cipher. Download the broadcast. Share the
          link. It sounds the same for everyone.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--fg-dim)]">
          <span className="dial" />
          <span>
            Built on our Spring Into AI submission — same Keeper, new station.{' '}
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="underline underline-offset-2 hover:text-[var(--paper)]"
            >
              ⓘ how it works
            </button>
          </span>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/create" className="btn">
            ▸ Build a palace
          </Link>
        </div>

        {palaces.length > 0 && (
          <div className="mt-12 space-y-3 max-w-xl">
            <span className="kicker">Your stations</span>
            {palaces.map((p) => {
              const wings = wingCount(p.itemCount)
              return (
                <div key={p.id} className="panel crt p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-[var(--paper)]">{p.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--fg-dim)]">
                      {TEMPLATE_LABEL[p.templateId]} · {p.itemCount} item{p.itemCount === 1 ? '' : 's'}
                      {wings > 1 ? ` · ${wings} wings` : ''} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/palace?id=${p.id}&wing=0`} className="btn btn--teal !text-xs">
                      Re-enter
                    </Link>
                    <Link href={`/radio?id=${p.id}&wing=0`} className="btn btn--ghost !text-xs">
                      Tune in
                    </Link>
                    {confirmingDelete === p.id ? (
                      <button type="button" onClick={() => handleDelete(p.id)} className="btn !text-xs !border-[var(--redact)] !text-[var(--redact)]">
                        confirm delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(p.id)}
                        className="text-xs text-[var(--fg-dim)] hover:text-[var(--redact)] px-2"
                      >
                        delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="panel crt max-w-lg w-full p-7 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="kicker">How it works</span>
            <h2 className="headline text-2xl mt-4">The Method of Loci, transmitted</h2>
            <ol className="mt-4 space-y-3 text-sm text-[var(--fg-dim)] list-decimal list-inside">
              <li>
                Tell it a topic or a short list. It assigns each item to a <b className="text-[var(--paper)]">locus</b> — a spot
                in a 3D station — with a vivid, easy-to-recall association.
              </li>
              <li>
                <b className="text-[var(--paper)]">Explore</b> the station: WASD to walk, drag to look around, click a beacon to see (and hear) what's there.
              </li>
              <li>
                <b className="text-[var(--paper)]">Tune in to Palace Radio</b>: a real voice — the Keeper — walks the ring in order.
                Turn on Spatial for headphone panning tied to each beacon's position, or Cipher for a numbers-station read-out
                you decode yourself.
              </li>
              <li>
                <b className="text-[var(--paper)]">Download the broadcast</b> as one audio file, or copy a link — anyone who opens
                it hears the exact same transmission.
              </li>
            </ol>
            <button type="button" onClick={() => setInfoOpen(false)} className="btn mt-6">
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
