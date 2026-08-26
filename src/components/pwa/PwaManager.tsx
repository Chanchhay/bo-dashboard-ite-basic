'use client'

import { useEffect } from 'react'

import { authClient } from '@/lib/auth/auth-client'

export function PwaManager() {
  const { data: session } = authClient.useSession()
  const isSignedIn = Boolean(session)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker is not supported')
      return
    }

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        console.log('Service Worker registered:', registration)
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()
  }, [])
  
  useEffect(() => {
    if (!isSignedIn || !('serviceWorker' in navigator)) return

    let cancelled = false

    navigator.serviceWorker.ready
      .then((registration) => {
        if (cancelled) return
        registration.active?.postMessage({ type: 'PRECACHE_POS_SHELL' })
      })
      .catch((error) => {
        console.warn('Could not warm the POS shell:', error)
      })

    return () => {
      cancelled = true
    }
  }, [isSignedIn])

  return null
}
