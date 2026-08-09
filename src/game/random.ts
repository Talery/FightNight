export class SeededRng {
  state: number

  constructor(seed: number) {
    this.state = seed || 0x6d2b79f5
  }

  next(): number {
    let value = (this.state += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pick<T>(list: readonly T[]): T {
    if (!list.length) throw new Error('Cannot pick from an empty content registry')
    return list[Math.floor(this.next() * list.length)]
  }

  chance(value: number): boolean {
    return this.next() < value
  }
}

export function mixSeed(seed: number, actionSequence: number): number {
  let value = (seed ^ Math.imul(actionSequence + 1, 0x9e3779b1)) >>> 0
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b)
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35)
  return (value ^ (value >>> 16)) >>> 0
}

export function rngForAction(seed: number, actionSequence: number): SeededRng {
  return new SeededRng(mixSeed(seed, actionSequence))
}

export function deterministicId(rng: SeededRng, prefix: string): string {
  const high = Math.floor(rng.next() * 0xffffffff).toString(36)
  const low = Math.floor(rng.next() * 0xffffffff).toString(36)
  return `${prefix}-${high}-${low}`
}

export function createRandomSeed(): number {
  const values = new Uint32Array(1)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values)
    return values[0] || 0x6d2b79f5
  }
  return ((Date.now() >>> 0) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
