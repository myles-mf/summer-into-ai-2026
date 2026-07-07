/**
 * Real, server-generated Keeper audio — replaces browser speechSynthesis so
 * every listener (including someone opening a shared broadcast link) hears
 * the exact same voice, and so the tour can be stitched into one downloadable
 * file. Lines are cached client-side by exact text so replay/scrub is free.
 */
'use client'

import { concatBuffers, audioBufferToWav } from './wav'

const cache = new Map<string, ArrayBuffer>()
let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    sharedCtx = new Ctor()
  }
  return sharedCtx
}

async function fetchLineAudio(text: string): Promise<ArrayBuffer> {
  const cached = cache.get(text)
  if (cached) return cached
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'The signal could not be reached.')
  }
  const buf = await res.arrayBuffer()
  cache.set(text, buf)
  return buf
}

export async function decodeLine(text: string): Promise<AudioBuffer> {
  const arr = await fetchLineAudio(text)
  // decodeAudioData detaches/consumes the buffer; slice so the cache entry survives.
  return getCtx().decodeAudioData(arr.slice(0))
}

export async function decodeLines(
  lines: string[],
  onProgress?: (done: number, total: number) => void
): Promise<AudioBuffer[]> {
  const out: AudioBuffer[] = []
  for (let i = 0; i < lines.length; i++) {
    out.push(await decodeLine(lines[i]))
    onProgress?.(i + 1, lines.length)
  }
  return out
}

export type Cue = { position?: [number, number, number] }

export type PlaybackHandle = { stop: () => void }

/** Plays pre-decoded buffers back-to-back. In spatial mode each buffer routes
 * through a PannerNode placed at its cue's 3D coordinate (the same coordinate
 * the beacon-ring scene uses), instead of the old fixed 5-slot position map. */
export function playSequence(
  buffers: AudioBuffer[],
  cues: Cue[],
  opts: { spatial?: boolean; onLineStart?: (i: number) => void; onDone?: () => void } = {}
): PlaybackHandle {
  const ctx = getCtx()
  let stopped = false
  let current: AudioBufferSourceNode | null = null

  function playAt(i: number) {
    if (stopped) return
    if (i >= buffers.length) {
      opts.onDone?.()
      return
    }
    opts.onLineStart?.(i)
    const source = ctx.createBufferSource()
    source.buffer = buffers[i]

    if (opts.spatial && cues[i]?.position) {
      const panner = ctx.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 3
      const [x, y, z] = cues[i].position!
      panner.positionX.value = x
      panner.positionY.value = y
      panner.positionZ.value = z
      source.connect(panner).connect(ctx.destination)
    } else {
      source.connect(ctx.destination)
    }

    current = source
    source.onended = () => {
      if (!stopped) playAt(i + 1)
    }
    source.start()
  }

  playAt(0)

  return {
    stop() {
      stopped = true
      try {
        current?.stop()
      } catch (_) {}
    },
  }
}

/** Stitches already-decoded clips into one downloadable WAV file. */
export function stitchToWav(buffers: AudioBuffer[]): Blob {
  const ctx = getCtx()
  const merged = concatBuffers(ctx, buffers)
  return audioBufferToWav(merged)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
