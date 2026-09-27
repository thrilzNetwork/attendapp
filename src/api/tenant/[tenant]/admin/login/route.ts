
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const body = await req.json()
  const password = (body.password || '').trim()
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Contrasena incorrecta' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, token: expected })
}
