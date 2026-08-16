import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sampleRate = 16000
const tau = Math.PI * 2
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const tracks = [
  {
    file: 'city-loop.wav', bpm: 76, seed: 0x51a7, gain: .72,
    chords: [[50, 53, 57, 60], [46, 50, 53, 57], [41, 45, 48, 52], [48, 52, 55, 62], [50, 53, 57, 60], [43, 46, 50, 53], [46, 50, 53, 57], [45, 49, 52, 55]],
    scale: [62, 65, 67, 69, 72, 74], noise: .010, drive: .05,
  },
  {
    file: 'expedition-loop.wav', bpm: 84, seed: 0x8e21, gain: .74,
    chords: [[52, 55, 59, 62], [48, 52, 55, 59], [45, 48, 52, 55], [50, 54, 57, 62], [52, 55, 59, 62], [47, 50, 54, 57], [48, 52, 55, 59], [50, 54, 57, 60]],
    scale: [64, 67, 69, 71, 74, 76], noise: .013, drive: .08,
  },
  {
    file: 'boss-loop.wav', bpm: 92, seed: 0xb055, gain: .76,
    chords: [[48, 51, 55, 58], [44, 48, 51, 55], [41, 44, 48, 51], [43, 47, 50, 53], [48, 51, 55, 58], [46, 49, 53, 56], [44, 48, 51, 55], [43, 47, 50, 53]],
    scale: [60, 63, 65, 67, 70, 72], noise: .016, drive: .12,
  },
]

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12)

function rng(seed) {
  let state = seed >>> 0
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 0x100000000)
}

function addTone(buffer, start, seconds, frequency, volume, decay, color = .18) {
  const first = Math.max(0, Math.floor(start * sampleRate))
  const count = Math.min(buffer.length - first, Math.floor(seconds * sampleRate))
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate
    const envelope = (1 - Math.exp(-t * 45)) * Math.exp(-t * decay)
    const wow = 1 + .0018 * Math.sin(tau * .42 * t)
    const phase = tau * frequency * wow * t
    buffer[first + i] += volume * envelope * (Math.sin(phase) + color * Math.sin(phase * 2.01) + .07 * Math.sin(phase * 3.98))
  }
}

function addKick(buffer, start, volume) {
  const first = Math.floor(start * sampleRate)
  const count = Math.min(buffer.length - first, Math.floor(.38 * sampleRate))
  let phase = 0
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate
    phase += tau * (43 + 82 * Math.exp(-t * 28)) / sampleRate
    buffer[first + i] += volume * Math.sin(phase) * Math.exp(-t * 12)
  }
}

function addNoiseHit(buffer, start, seconds, volume, random, tone) {
  const first = Math.floor(start * sampleRate)
  const count = Math.min(buffer.length - first, Math.floor(seconds * sampleRate))
  let filtered = 0
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate
    const white = random() * 2 - 1
    filtered += tone * (white - filtered)
    buffer[first + i] += volume * filtered * Math.exp(-t * (seconds < .1 ? 45 : 18))
  }
}

function makeTrack(config) {
  const beat = 60 / config.bpm
  const duration = beat * 32
  const length = Math.round(duration * sampleRate)
  const dry = new Float64Array(length)
  const random = rng(config.seed)

  config.chords.forEach((chord, bar) => {
    const barStart = bar * beat * 4
    chord.forEach((note, index) => {
      addTone(dry, barStart, beat * 3.5, hz(note), .115 - index * .012, 1.35, .23)
      addTone(dry, barStart + beat * 2, beat * 1.8, hz(note), .048, 1.8, .16)
    })
    const bass = chord[0] - 12
    addTone(dry, barStart, beat * 1.4, hz(bass), .22, 2.8, .08)
    addTone(dry, barStart + beat * 2, beat * 1.25, hz(bass + (bar % 3 === 1 ? 7 : 0)), .15, 3.1, .06)

    for (let step = 0; step < 8; step += 1) {
      const at = barStart + step * beat / 2
      addNoiseHit(dry, at, .055, step % 2 ? .025 : .038, random, .42)
      if (step === 0 || step === 4) addKick(dry, at, bar % 2 ? .34 : .39)
      if (step === 2 || step === 6) addNoiseHit(dry, at, .24, .18, random, .16)
      if ((step === 1 || step === 5) && random() > .28) {
        const note = config.scale[Math.floor(random() * config.scale.length)]
        addTone(dry, at + beat * .08, beat * .7, hz(note), .055, 3.8, .12)
      }
    }
  })

  let dust = 0
  for (let i = 0; i < length; i += 1) {
    dust += .025 * ((random() * 2 - 1) - dust)
    dry[i] += dust * config.noise
  }

  const echo = Math.round(beat * .75 * sampleRate)
  const mixed = new Float64Array(length)
  let low = 0
  for (let i = 0; i < length; i += 1) {
    const delayed = dry[(i - echo + length) % length]
    const value = dry[i] + delayed * .13
    low += .42 * (value - low)
    mixed[i] = Math.tanh((low + value * .34) * (1 + config.drive)) * config.gain
  }
  return mixed
}

function wav(samples) {
  const dataSize = samples.length * 2
  const bytes = Buffer.alloc(44 + dataSize)
  bytes.write('RIFF', 0)
  bytes.writeUInt32LE(36 + dataSize, 4)
  bytes.write('WAVEfmt ', 8)
  bytes.writeUInt32LE(16, 16)
  bytes.writeUInt16LE(1, 20)
  bytes.writeUInt16LE(1, 22)
  bytes.writeUInt32LE(sampleRate, 24)
  bytes.writeUInt32LE(sampleRate * 2, 28)
  bytes.writeUInt16LE(2, 32)
  bytes.writeUInt16LE(16, 34)
  bytes.write('data', 36)
  bytes.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i += 1) bytes.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2)
  return bytes
}

const targetDir = resolve(root, 'src/assets/audio')
await mkdir(targetDir, { recursive: true })
for (const track of tracks) {
  const samples = makeTrack(track)
  await writeFile(resolve(targetDir, track.file), wav(samples))
  console.log(`${track.file}: ${(samples.length / sampleRate).toFixed(2)}s, ${track.bpm} BPM`)
}
