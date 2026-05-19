// Uses Web Crypto API — works on both Node.js (18+) and Edge Runtime

const SECRET = process.env.HMAC_SECRET

async function signMessage(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifyMessage(message: string, signature: string, secret: string): Promise<boolean> {
  const expected = await signMessage(message, secret)
  if (expected.length !== signature.length) return false
  // Constant-time comparison to prevent timing attacks
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= (expected.charCodeAt(i) ?? 0) ^ (signature.charCodeAt(i) ?? 0)
  }
  return mismatch === 0
}

// v2 payload embeds attendee name for instant display on scan.
// v1 payloads (legacy, no name) are still accepted by verifyPayload.
export async function buildPayload(token: string, name?: string | null): Promise<string> {
  const v = 2
  const n = name ?? ''
  if (!SECRET) {
    return JSON.stringify({ v, n, t: token })
  }
  const s = await signMessage(`v=${v}&n=${n}&t=${token}`, SECRET)
  return JSON.stringify({ v, n, t: token, s })
}

export async function verifyPayload(raw: string): Promise<{ t: string; n: string | null } | null> {
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

  const obj = parsed as { v: number; t: string; n?: string; s?: string }

  if (SECRET) {
    if (!obj.s) return null
    // Support v1 (legacy, no name) and v2 (with name) signing schemes
    const message = obj.v === 1
      ? `v=${obj.v}&t=${obj.t}`
      : `v=${obj.v}&n=${obj.n ?? ''}&t=${obj.t}`
    const valid = await verifyMessage(message, obj.s, SECRET)
    if (!valid) return null
  }

  return { t: obj.t, n: obj.n ?? null }
}
