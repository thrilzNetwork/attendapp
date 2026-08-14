import { NextResponse } from 'next/server';

export async function GET() {
  const p = Buffer.from('KzE5NTQ0NDg3NDUy', 'base64').toString('utf-8');
  return NextResponse.json({
    ok: true,
    phone: p,
    phone_id: 'phnum_9901kzrhgtmnfegtknep2pegsa6z',
  });
}