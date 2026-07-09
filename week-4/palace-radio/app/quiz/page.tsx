'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Association } from '../lib/palace'
import { getPalace } from '../lib/palace-library'
import { claimHouse } from '../lib/claim'
import { getTemplate } from '../lib/house'

type Question = { prompt: string; options: string[]; answer: string; kind: 'locus' | 'item' }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(associations: Association[]): Question[] {
  return associations.map((a, i) => {
    const askItem = i % 2 === 0
    if (askItem) {
      const distractors = shuffle(associations.filter((_, j) => j !== i).map((x) => x.item)).slice(0, 3)
      return { prompt: `What's at the ${a.locus}?`, options: shuffle([a.item, ...distractors]), answer: a.item, kind: 'item' }
    }
    const distractors = shuffle(associations.filter((_, j) => j !== i).map((x) => x.locus)).slice(0, 3)
    return { prompt: `Where is "${a.item}"?`, options: shuffle([a.locus, ...distractors]), answer: a.locus, kind: 'locus' }
  })
}

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const wing = parseInt(searchParams.get('wing') ?? '0', 10) || 0

  const [associations, setAssociations] = useState<Association[] | null>(null)
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [challenge, setChallenge] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!id) {
      router.replace('/')
      return
    }
    const p = getPalace(id)
    if (!p || !p.associations.length) {
      router.replace('/')
      return
    }
    // Quiz on the CLAIMED prop names, same convention as the 3D room and
    // the broadcast — otherwise "where is X" could name a spot the room
    // itself doesn't call that (claiming can fall back to a different word).
    const template = getTemplate(p.templateId)
    const claimed = claimHouse(p.associations, template, wing)
    setAssociations(claimed.map((c) => ({ locus: c.prop.id, item: c.association.item, sentence: c.association.sentence, emoji: c.association.emoji })))
  }, [id, wing, router])

  const questions = useMemo(() => (associations ? buildQuestions(associations) : []), [associations])
  const itemEmoji = useMemo(
    () => Object.fromEntries((associations ?? []).filter((a) => a.emoji).map((a) => [a.item, a.emoji as string])),
    [associations]
  )

  useEffect(() => {
    if (!challenge) return
    setTimeLeft(60)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setChallenge(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [challenge])

  function pick(option: string) {
    if (picked) return
    setPicked(option)
    if (option === questions[index]?.answer) setScore((s) => s + 1)
    setTimeout(() => {
      setPicked(null)
      setIndex((i) => (i + 1) % questions.length)
    }, 700)
  }

  if (!associations) return <main className="min-h-screen flex items-center justify-center text-[var(--fg-dim)]">Loading…</main>

  const q = questions[index]

  return (
    <main className="min-h-screen">
      <header className="panel border-b px-6 py-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/" className="text-xs text-[var(--fg-dim)] hover:text-[var(--amber)]">
            ← Palace Radio
          </Link>
          <h1 className="headline text-2xl mt-2">Quiz</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[var(--teal)]">score: {score}</span>
          {challenge && <span className="text-[var(--redact)]">⏱ {timeLeft}s</span>}
          <button
            type="button"
            onClick={() => setChallenge((c) => !c)}
            className={`btn !text-xs ${challenge ? 'btn--ghost' : ''}`}
          >
            {challenge ? 'stop challenge' : '60s challenge'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="text-xs uppercase tracking-widest text-[var(--fg-dim)]">
          question {index + 1} / {questions.length}
        </p>
        <h2 className="mt-3 text-2xl font-bold">{q.prompt}</h2>

        <div className="mt-6 grid gap-3">
          {q.options.map((opt, i) => {
            const isPicked = picked === opt
            const isAnswer = opt === q.answer
            const showResult = picked !== null
            let cls = 'panel px-4 py-3 text-left transition'
            if (showResult && isAnswer) cls += ' border-[var(--teal)] text-[var(--teal)]'
            else if (showResult && isPicked) cls += ' border-[var(--redact)] text-[var(--redact)]'
            else cls += ' hover:border-[var(--amber)]'
            return (
              <button key={opt + i} type="button" onClick={() => pick(opt)} disabled={picked !== null} className={cls}>
                <span className="text-[var(--fg-dim)] mr-2">{i + 1}.</span>
                {q.kind === 'item' && itemEmoji[opt] ? itemEmoji[opt] + ' ' : ''}
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-[var(--fg-dim)]">Loading…</main>}>
      <QuizContent />
    </Suspense>
  )
}
