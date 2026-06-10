import type { BeforeInstallPromptEvent } from '~/composables/usePwaInstall'

export default defineNuxtPlugin(() => {
  const deferredPrompt = useState<BeforeInstallPromptEvent | null>('pwa-install-prompt', () => null)

  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the mini-infobar so we can trigger the prompt from our own UI.
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null
  })

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failures are non-fatal; the app still works without the SW.
      })
    })
  }
})
