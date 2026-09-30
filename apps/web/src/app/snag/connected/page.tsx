// apps/web/src/app/snag/connected/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/*
 * Where SNAG sends the reader after signing in with X or Discord for a quest
 * (see /api/snag/quest). It tells the /snag page, which then has SNAG confirm
 * the connection: in a sign-in popup it announces the return and closes; when
 * the sign-in ran in the main tab it goes back to /snag.
 */
export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const quest = params.get('quest') || ''
    if (params.get('popup') === '1') {
      try {
        const channel = new BroadcastChannel('lumera-snag')
        channel.postMessage({ type: 'snag-returned', quest })
        channel.close()
      } catch {
        // No channel: closing the window still re-reads progress.
      }
      window.close()
      return
    }
    router.replace(quest ? `/snag?returned=${encodeURIComponent(quest)}` : '/snag')
  }, [router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-base text-text-muted">
      Connected. You can close this window.
    </div>
  )
}
