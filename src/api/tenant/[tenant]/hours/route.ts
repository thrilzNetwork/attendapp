import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/tenant/store'
import { isOpenNowInLaPaz } from '@/lib/tenant/fukin-engine/hours'

export const dynamic = 'force-dynamic'

/** Public (no auth): what the store UI needs to reflect hours. */
export async function GET(_req: NextRequest, { params }: { params: { tenant: string } }) {
  const { tenant } = params
  const settings = await getSettings(tenant)
  return NextResponse.json({
    hoursEnabled: settings.hoursEnabled,
    hoursOpen: settings.hoursOpen,
    hoursClose: settings.hoursClose,
    isOpenNow: isOpenNowInLaPaz(settings),
  })
}
