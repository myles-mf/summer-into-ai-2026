/** Concatenate decoded clips + encode as a standard 16-bit PCM WAV so the
 * broadcast can be downloaded/shared as one real, universally-playable file
 * (sidesteps the fragility of naively concatenating independently-encoded
 * compressed clips). */
export function concatBuffers(ctx: BaseAudioContext, buffers: AudioBuffer[]): AudioBuffer {
  const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels))
  const sampleRate = buffers[0].sampleRate
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0)
  const out = ctx.createBuffer(numChannels, totalLength, sampleRate)

  let offset = 0
  for (const b of buffers) {
    for (let ch = 0; ch < numChannels; ch++) {
      const data = ch < b.numberOfChannels ? b.getChannelData(ch) : b.getChannelData(0)
      out.getChannelData(ch).set(data, offset)
    }
    offset += b.length
  }
  return out
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataLength = buffer.length * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  const channels: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) channels.push(buffer.getChannelData(ch))

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}
