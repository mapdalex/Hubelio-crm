import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.AUTH_SECRET || 'fallback-secret-change-in-production'
const key = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: string
  email: string
  name: string
  role: string
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
