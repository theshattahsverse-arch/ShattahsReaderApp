'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Recovers Supabase session from URL hash after magic-link redirect (e.g. Reddit OAuth).
 * Supabase redirects to site URL with #access_token=...&type=magiclink; the server never
 * sees the hash, so we must parse it on the client and set the session.
 */
export function AuthHashHandler() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current || typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token') || !hash.includes('type=magiclink')) return

    handled.current = true
    const supabase = createClient()

    const params = new URLSearchParams(hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) return

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(() => {
        // Clear hash so tokens are not visible in URL or history
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        router.refresh()
      })
      .catch((err) => {
        console.error('Auth hash recovery failed:', err)
        handled.current = false
      })
  }, [router])

  return null
}
