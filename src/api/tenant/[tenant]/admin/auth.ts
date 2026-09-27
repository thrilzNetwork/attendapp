
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

const attempts = new Map<string, { n: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { n: 1, resetAt: now + 10 * 60 * 1000 })
    return false
  }
  rec.n += 1
  return rec.n > 10
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.headers.get('x-admin-token') || ''
  if (!ADMIN_PASSWORD) return NextResponse.json({ error: 'ADMIN_PASSWORD no configurada' }, { status: 500 })
  if (!token || token !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}

export function checkRateLimit(req: NextRequest): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) return NextResponse.json({ error: 'Demasiados intentos. Espera 10 min.' }, { status: 429 })
  return null
}
