import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporarily disable all middleware for chat testing
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};