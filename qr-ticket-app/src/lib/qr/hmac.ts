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

export async function buildPayload(token: string): Promise<string> {
  const v = 1
  if (!SECRET) {
    return JSON.stringify({ v, t: token })
  }
  const s = await signMessage(`v=${v}&t=${token}`, SECRET)
  return JSON.stringify({ v, t: token, s })
}

export async function verifyPayload(raw: string): Promise<{ t: string } | null> {
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
    if (!obj.s) return null
    const valid = await verifyMessage(`v=${obj.v}&t=${obj.t}`, obj.s, SECRET)
    if (!valid) return null
  }

  return { t: obj.t }
}
