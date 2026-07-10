'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Association } from '../lib/palace'
import { createPalace, savePalace, wingCount, PROPS_PER_WING, type RoomTemplateId, type StoredPalace } from '../lib/palace-library'
import { listTemplates, templateLoci, DEFAULT_TEMPLATE_ID } from '../lib/house'
import { materialize, getUserKey, setUserKey, type GenState } from '../lib/model-gen'

type Step = 'choose' | 'topic' | 'done'
const MAX_WINGS = 4
/** Free-tier (our Tripo key) materialization is limited to small rooms --
 * the shared credit pack is finite. Bigger rooms need the visitor's own key. */
const FREE_GEN_MAX_ITEMS = 6

export default function CreatePage() {
  const router = useRouter()
  const templates = listTemplates()

  const [step, setStep] = useState<Step>('choose')
  const [templateId, setTemplateId] = useState<RoomTemplateId>(DEFAULT_TEMPLATE_ID)
  const [useTemplate, setUseTemplate] = useState(true)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [loci, setLoci] = useState<string[]>(templateLoci(DEFAULT_TEMPLATE_ID))
  const [lociLoading, setLociLoading] = useState(false)
  const [lociError, setLociError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [topicOrList, setTopicOrList] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [associations, setAssociations] = useState<Association[] | null>(null)
  const [palace, setPalace] = useState<StoredPalace | null>(null)
  const [addingWing, setAddingWing] = useState(false)

  const [genStates, setGenStates] = useState<Record<string, GenState>>({})
  const [genRunning, setGenRunning] = useState(false)
  const [userKey, setUserKeyState] = useState(() => getUserKey())
  const [showKeyInput, setShowKeyInput] = useState(false)

  function saveUserKey(key: string) {
    setUserKey(key)
    setUserKeyState(key.trim())
  }

  async function runMaterialize() {
    if (!palace || !associations || genRunning) return
    // Model-store keys are palaceId:locus, and loci repeat across wings --
    // materialization is scoped to single-wing palaces (the panel is hidden
    // for multi-wing ones below).
    const targets = associations.slice(0, PROPS_PER_WING)
    setGenRunning(true)
    setGenStates(Object.fromEntries(targets.map((a) => [a.locus, 'pending' as GenState])))
    await materialize(palace.id, targets, userKey, (locus, state) =>
      setGenStates((s) => ({ ...s, [locus]: state }))
    )
    setGenRunning(false)
  }

  function pickTemplate(id: RoomTemplateId) {
    setTemplateId(id)
    setUseTemplate(true)
    setUploadedImage(null)
    setLoci(templateLoci(id))
    setStep('topic')
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topicOrList.trim() || !name.trim()) return
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
      const created = createPalace({
        name: name.trim(),
        templateId,
        associations: list,
        loci,
        imageDataUrl: useTemplate ? undefined : uploadedImage ?? undefined,
      })
      setPalace(created)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function addWing() {
    if (!palace || !associations) return
    setAddingWing(true)
    setError(null)
    try {
      const res = await fetch('/api/associations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicOrList: topicOrList.trim(),
          loci: templateLoci(templateId),
          excludeItems: associations.map((a) => a.item),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || res.statusText)
      const more: Association[] = data.associations ?? []
      const merged = [...associations, ...more]
      setAssociations(merged)
      const updated = { ...palace, associations: merged }
      savePalace(updated)
      setPalace(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add a wing')
    } finally {
      setAddingWing(false)
    }
  }

  const currentWings = associations ? wingCount(associations.length) : 1

  return (
    <main className="min-h-screen">
      <header className="panel border-b px-6 py-6">
        <Link href="/" className="text-xs text-[var(--fg-dim)] hover:text-[var(--amber)]">
          ← Palace Radio
        </Link>
        <h1 className="headline text-3xl mt-2">Build a palace</h1>
        <p className="mt-1 text-sm text-[var(--fg-dim)]">
          {step === 'choose' && 'Pick a station, or read a photo of your room for personal loci.'}
          {step === 'topic' && `Loci ready: ${loci.join(', ')}`}
        </p>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        {step === 'choose' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  className="panel crt p-6 text-left hover:border-[var(--amber)] transition"
                >
                  <span className="font-bold text-[var(--amber)]">{t.name}</span>
                  <p className="mt-2 text-sm text-[var(--fg-dim)]">
                    A fixed, fully-furnished room. Your words claim spots already there, up to {t.props.length} at a time — instant, try it in under a minute.
                  </p>
                </button>
              ))}
            </div>
            <div className="panel crt p-6">
              <span className="font-bold text-[var(--teal)]">Read my room</span>
              <p className="mt-2 text-sm text-[var(--fg-dim)]">
                Upload a photo; the vision model reads 4–6 loci from it to personalize your words. You'll still pick a
                station above for the visual room — this only changes what the words are.
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
              <label className="block text-sm font-bold">Name this station</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chemistry basics"
                disabled={loading}
                required
                className="w-full bg-[var(--panel-2)] border border-[var(--line)] px-3 py-2 text-[var(--paper)] placeholder-[var(--fg-dim)] focus:border-[var(--amber)] focus:outline-none"
              />

              <label className="block text-sm font-bold">What do you want to remember?</label>
              <p className="text-xs text-[var(--fg-dim)]">
                A topic, or a short list — one item lands on each beacon. Keep it to {FREE_GEN_MAX_ITEMS} or fewer
                to qualify for free AI-sculpted 3D objects afterwards.
              </p>
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
              <button type="submit" disabled={loading || !topicOrList.trim() || !name.trim()} className="btn">
                {loading ? 'Generating…' : '▸ Generate associations'}
              </button>
            </form>
            {error && <p className="mt-4 text-sm text-[var(--redact)]">{error}</p>}
          </>
        )}

        {step === 'done' && associations && palace && (
          <div>
            <h2 className="headline text-2xl">Station ready</h2>
            <p className="mt-1 text-xs text-[var(--fg-dim)]">
              {associations.length} item{associations.length === 1 ? '' : 's'}
              {currentWings > 1 ? ` across ${currentWings} wings` : ''} of {palace.name}.
            </p>
            <ul className="mt-4 space-y-3">
              {associations.map((a, i) => (
                <li key={i} className="panel px-4 py-3">
                  {currentWings > 1 && (
                    <span className="text-[var(--fg-dim)] text-xs mr-2">wing {Math.floor(i / PROPS_PER_WING) + 1}</span>
                  )}
                  <span className="text-[var(--amber)] font-bold">{a.locus}</span>
                  <span className="text-[var(--fg-dim)]"> → </span>
                  <span>{a.emoji ? a.emoji + ' ' : ''}{a.item}</span>
                  {genStates[a.locus] && (
                    <span
                      className={`ml-2 text-xs ${
                        genStates[a.locus] === 'done'
                          ? 'text-[var(--teal)]'
                          : genStates[a.locus] === 'failed'
                            ? 'text-[var(--redact)]'
                            : 'text-[var(--fg-dim)]'
                      }`}
                    >
                      {genStates[a.locus] === 'pending' && '· queued'}
                      {genStates[a.locus] === 'sculpting' && '· sculpting…'}
                      {genStates[a.locus] === 'done' && '· ✦ sculpted'}
                      {genStates[a.locus] === 'failed' && '· kept the simple shape'}
                    </span>
                  )}
                  <p className="mt-1 text-sm italic text-[var(--fg-dim)]">&ldquo;{a.sentence}&rdquo;</p>
                </li>
              ))}
            </ul>

            {currentWings === 1 && (
              <div className="panel crt p-4 mt-6">
                <span className="font-bold text-[var(--amber)]">⚡ Materialize objects (AI 3D)</span>
                <p className="mt-1 text-xs text-[var(--fg-dim)]">
                  Sculpt each item&apos;s vivid detail into a real, unique 3D object in your room (~30s each).
                  {!userKey && ` Free on the house for rooms of ${FREE_GEN_MAX_ITEMS} items or fewer, while the free pool lasts.`}
                  {userKey && ' Using your Tripo key — your account, your cost.'}
                </p>
                {associations.length > FREE_GEN_MAX_ITEMS && !userKey && (
                  <p className="mt-2 text-xs text-[var(--redact)]">
                    This room has {associations.length} items — the free tier covers rooms of {FREE_GEN_MAX_ITEMS} or fewer.
                    Paste your own Tripo key below to sculpt bigger rooms.
                  </p>
                )}
                <button
                  type="button"
                  onClick={runMaterialize}
                  disabled={genRunning || (associations.length > FREE_GEN_MAX_ITEMS && !userKey)}
                  className="btn mt-3 !text-xs"
                >
                  {genRunning ? 'Sculpting…' : '⚡ Materialize'}
                </button>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowKeyInput((v) => !v)}
                    className="text-xs text-[var(--teal)] hover:underline"
                  >
                    {userKey ? 'Using your own Tripo key ▾' : 'Use your own Tripo API key ▾'}
                  </button>
                  {showKeyInput && (
                    <div className="mt-2">
                      <p className="text-xs text-[var(--fg-dim)]">
                        Stays in this browser only (localStorage); sent per-request straight through to Tripo,
                        never stored on our server. Get one at platform.tripo3d.ai.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="password"
                          defaultValue={userKey}
                          placeholder="tsk_..."
                          onBlur={(e) => saveUserKey(e.target.value)}
                          className="flex-1 bg-[var(--panel-2)] border border-[var(--line)] px-2 py-1 text-xs text-[var(--paper)] placeholder-[var(--fg-dim)] focus:border-[var(--teal)] focus:outline-none"
                        />
                        {userKey && (
                          <button type="button" onClick={() => saveUserKey('')} className="btn btn--ghost !text-xs">
                            clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentWings < MAX_WINGS && (
              <button type="button" onClick={addWing} disabled={addingWing} className="btn btn--ghost mt-4 !text-xs">
                {addingWing ? 'Generating…' : `+ Add another wing (${associations.length}/${MAX_WINGS * PROPS_PER_WING} items)`}
              </button>
            )}
            {error && <p className="mt-2 text-xs text-[var(--redact)]">{error}</p>}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/palace?id=${palace.id}&wing=0`} className="btn">
                Enter the station
              </Link>
              <Link href={`/radio?id=${palace.id}&wing=0`} className="btn btn--teal">
                Tune in to Palace Radio
              </Link>
              <Link href={`/quiz?id=${palace.id}&wing=0`} className="btn btn--ghost">
                Jump to quiz
              </Link>
              <button type="button" onClick={() => router.push('/')} className="btn btn--ghost">
                Back to stations
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
