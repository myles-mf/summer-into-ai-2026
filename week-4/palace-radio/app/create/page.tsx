'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { TEMPLATE_LOCI, savePalace, type Association } from '../lib/palace'

type Step = 'choose' | 'topic' | 'done'

export default function CreatePage() {
  const [step, setStep] = useState<Step>('choose')
  const [useTemplate, setUseTemplate] = useState(true)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [loci, setLoci] = useState<string[]>([...TEMPLATE_LOCI])
  const [lociLoading, setLociLoading] = useState(false)
  const [lociError, setLociError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [topicOrList, setTopicOrList] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [associations, setAssociations] = useState<Association[] | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setLociError(null)
    const reader = new FileReader()
    reader.onload = () => setUploadedImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function analyzeRoom() {
    if (!uploadedImage) return
    setLociLoading(true)
    setLociError(null)
    try {
      const res = await fetch('/api/loci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadedImage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || res.statusText)
      setLoci(data.loci ?? [])
      setUseTemplate(false)
      setStep('topic')
    } catch (err) {
      setLociError(err instanceof Error ? err.message : 'Could not read that room')
    } finally {
      setLociLoading(false)
    }
  }

  function chooseTemplate() {
    setUseTemplate(true)
    setUploadedImage(null)
    setLoci([...TEMPLATE_LOCI])
    setStep('topic')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topicOrList.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/associations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicOrList: topicOrList.trim(), loci }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || res.statusText)
      const list: Association[] = data.associations ?? []
      setAssociations(list)
      savePalace({ associations: list, loci, imageDataUrl: useTemplate ? undefined : uploadedImage ?? undefined })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <header className="panel border-b px-6 py-6">
        <Link href="/" className="text-xs text-[var(--fg-dim)] hover:text-[var(--amber)]">
          ← Palace Radio
        </Link>
        <h1 className="headline text-3xl mt-2">Build a palace</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">
          {step === 'choose' && 'Use a template station or read a photo of your room for personal loci.'}
          {step === 'topic' && `Loci ready: ${loci.join(', ')}`}
        </p>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        {step === 'choose' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={chooseTemplate} className="panel crt p-6 text-left hover:border-[var(--amber)] transition">
              <span className="font-bold text-[var(--amber)]">Template station</span>
              <p className="mt-2 text-sm text-[var(--fg-dim)]">
                Ten beacons around a full room: door, desk, window, bed, shelf, chair, lamp, bookshelf, mirror, table. Instant — try it in under a minute.
              </p>
            </button>
            <div className="panel crt p-6">
              <span className="font-bold text-[var(--teal)]">Read my room</span>
              <p className="mt-2 text-sm text-[var(--fg-dim)]">
                Upload a photo; the vision model reads 4–6 loci from it to personalize your station.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="mt-3 block w-full text-xs text-[var(--fg-dim)] file:mr-3 file:border file:border-[var(--teal)] file:bg-transparent file:px-2 file:py-1 file:text-[var(--teal)]"
              />
              {uploadedImage && (
                <div className="mt-3">
                  <img src={uploadedImage} alt="Your room" className="max-h-28 rounded border border-[var(--line)] object-contain" />
                  <button type="button" onClick={analyzeRoom} disabled={lociLoading} className="btn btn--teal mt-2 !text-xs">
                    {lociLoading ? 'Reading…' : 'Read the room'}
                  </button>
                </div>
              )}
              {lociError && <p className="mt-2 text-xs text-[var(--redact)]">{lociError}</p>}
            </div>
          </div>
        )}

        {step === 'topic' && (
          <>
            <button type="button" onClick={() => setStep('choose')} className="text-xs text-[var(--amber)] hover:underline mb-6">
              ← change station
            </button>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-bold">What do you want to remember?</label>
              <p className="text-xs text-[var(--fg-dim)]">A topic, or a short list — one item lands on each beacon.</p>
              <div className="flex flex-wrap gap-2">
                {['the first 5 elements of the periodic table', 'the quadratic formula', 'five Spanish words for colors'].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setTopicOrList(ex)}
                    className="border border-[var(--line)] px-2 py-1 text-xs text-[var(--fg-dim)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <textarea
                value={topicOrList}
                onChange={(e) => setTopicOrList(e.target.value)}
                rows={3}
                placeholder="e.g. the first 5 elements of the periodic table"
                disabled={loading}
                className="w-full bg-[var(--panel-2)] border border-[var(--line)] px-3 py-2 text-[var(--paper)] placeholder-[var(--fg-dim)] focus:border-[var(--amber)] focus:outline-none"
              />
              <button type="submit" disabled={loading || !topicOrList.trim()} className="btn">
                {loading ? 'Generating…' : '▸ Generate associations'}
              </button>
            </form>
            {error && <p className="mt-4 text-sm text-[var(--redact)]">{error}</p>}
          </>
        )}

        {step === 'done' && associations && (
          <div>
            <h2 className="headline text-2xl">Station ready</h2>
            <ul className="mt-4 space-y-3">
              {associations.map((a, i) => (
                <li key={i} className="panel px-4 py-3">
                  <span className="text-[var(--amber)] font-bold">{a.locus}</span>
                  <span className="text-[var(--fg-dim)]"> → </span>
                  <span>{a.item}</span>
                  <p className="mt-1 text-sm italic text-[var(--fg-dim)]">&ldquo;{a.sentence}&rdquo;</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/palace" className="btn">
                Enter the station
              </Link>
              <Link href="/radio" className="btn btn--teal">
                Tune in to Palace Radio
              </Link>
              <Link href="/quiz" className="btn btn--ghost">
                Jump to quiz
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
