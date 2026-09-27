import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/tenant/store'
import { Settings } from '@/lib/tenant/types'
import { isValidHHMM } from '@/lib/tenant/fukin-engine/hours'
import { requireAdmin } from '../auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  return NextResponse.json(await getSettings(tenant, ))
}

export async function PATCH(req: NextRequest, { params }: { params: { tenant: string } }) {
    const { tenant } = params
  const err = requireAdmin(req)
  if (err) return err
  const body = await req.json()
  const current = await getSettings(tenant, )
  const next: Settings = {
    ordersPaused: typeof body.ordersPaused === 'boolean' ? body.ordersPaused : current.ordersPaused,
    capacity: typeof body.capacity === 'number' ? Math.max(1, Math.min(50, body.capacity)) : current.capacity,
    hoursOpen: typeof body.hoursOpen === 'string' && isValidHHMM(body.hoursOpen) ? body.hoursOpen : current.hoursOpen,
    hoursClose: typeof body.hoursClose === 'string' && isValidHHMM(body.hoursClose) ? body.hoursClose : current.hoursClose,
    hoursEnabled: typeof body.hoursEnabled === 'boolean' ? body.hoursEnabled : current.hoursEnabled,
  }
  await saveSettings(tenant, next)
  return NextResponse.json(next)
}