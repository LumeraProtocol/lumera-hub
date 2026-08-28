import { NextResponse } from 'next/server'

import { isWslEnvironment } from '@/utils/chrome-devtools-workspace'

export function middleware() {
  // Next.js advertises its Linux project root to Chrome through this endpoint.
  // Windows Chrome cannot access that WSL path and reports `<illegal path>`.
  return isWslEnvironment()
    ? new NextResponse(null, { status: 204 })
    : NextResponse.next()
}

export const config = {
  matcher: '/.well-known/appspecific/com.chrome.devtools.json',
}
