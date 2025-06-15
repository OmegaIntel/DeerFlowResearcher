import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  console.error('[DEBUG-API]', body);
  return NextResponse.json({ received: true });
}