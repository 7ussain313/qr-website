import { createHmac } from 'crypto'

const SECRET = process.env.HMAC_SECRET

function sign(t: string, v: number): string {
  return createHmac('sha256', SECRET!).update(`v=${v}&t=${t}`).digest('hex')
}

export function buildPayload(token: string): string {
  const v = 1
  if (!SECRET) {
    return JSON.stringify({ v, t: token })
  }
  return JSON.stringify({ v, t: token, s: sign(token, v) })
}

export function verifyPayload(raw: string): { t: string } | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).t !== 'string' ||
    typeof (parsed as Record<string, unknown>).v !== 'number'
  ) {
    return null
  }

  const obj = parsed as { v: number; t: string; s?: string }

  if (SECRET) {
    if (!obj.s || obj.s !== sign(obj.t, obj.v)) return null
  }

  return { t: obj.t }
}
