import { NextRequest, NextResponse } from 'next/server';

export function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (orderId) {
    return NextResponse.redirect(new URL(`/track/${orderId}`, req.url));
  }
  return NextResponse.redirect(new URL('/', req.url));
}