const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%&*'
const ALL = UPPER + LOWER + DIGITS + SYMBOLS

function pickChar(chars: string): string {
  const buf = new Uint8Array(1)
  crypto.getRandomValues(buf)
  return chars[buf[0]! % chars.length]!
}

export function generatePassword(): string {
  // Guarantee at least one of each character class
  const required = [pickChar(UPPER), pickChar(LOWER), pickChar(DIGITS), pickChar(SYMBOLS)]

  // Fill remaining 12 positions from the full alphabet
  const buf = new Uint8Array(12)
  crypto.getRandomValues(buf)
  const rest = Array.from(buf, (b) => ALL[b % ALL.length]!)

  // Fisher-Yates shuffle
  const chars = [...required, ...rest]
  for (let i = chars.length - 1; i > 0; i--) {
    const jBuf = new Uint8Array(1)
    crypto.getRandomValues(jBuf)
    const j = jBuf[0]! % (i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }

  return chars.join('')
}
