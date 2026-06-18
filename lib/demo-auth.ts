export const COOKIE_NAME = 'spillit_demo_session'

export interface DemoSession {
  email: string
  exp: number
}

function getSecret(): string {
  return process.env.DEMO_JWT_SECRET ?? 'spillit-demo-secret-change-me-in-prod'
}

async function getKey(usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  )
}

function uint8ToBase64url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlToUint8(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + pad)
  const buf = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function createDemoToken(email: string, ttlHours = 24): Promise<string> {
  const payload: DemoSession = {
    email,
    exp: Math.floor(Date.now() / 1000) + ttlHours * 3600,
  }
  const encoded = uint8ToBase64url(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await getKey(['sign'])
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded))
  const sig = uint8ToBase64url(new Uint8Array(sigBuf))
  return `${encoded}.${sig}`
}

export async function verifyDemoToken(token: string): Promise<DemoSession | null> {
  try {
    const dotIdx = token.lastIndexOf('.')
    if (dotIdx < 0) return null
    const encoded = token.slice(0, dotIdx)
    const sigStr = token.slice(dotIdx + 1)
    const key = await getKey(['verify'])
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlToUint8(sigStr),
      new TextEncoder().encode(encoded)
    )
    if (!valid) return null
    const payload = JSON.parse(
      new TextDecoder().decode(base64urlToUint8(encoded))
    ) as DemoSession
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
