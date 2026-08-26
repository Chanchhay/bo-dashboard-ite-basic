'use client'

import { useEffect } from 'react'

export function PwaManager() {
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

  return null
}