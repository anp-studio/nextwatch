import { computed, ref } from 'vue'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

function detectIos(): boolean {
  if (!import.meta.client) {
    return false
  }

  const ua = navigator.userAgent || ''
  const isIosDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports as a Mac, so detect it via touch support.
  const isIpadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1

  return isIosDevice || isIpadOs
}

function detectStandalone(): boolean {
  if (!import.meta.client) {
    return false
  }

  const matchesStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true

  return matchesStandalone || iosStandalone
}

export function usePwaInstall() {
  const deferredPrompt = useState<BeforeInstallPromptEvent | null>('pwa-install-prompt', () => null)
  const showIosModal = ref(false)

  const isIos = computed(detectIos)
  const isStandalone = computed(detectStandalone)
  const canInstall = computed(() => Boolean(deferredPrompt.value) && !isStandalone.value)
  const showInstallOption = computed(
    () => (canInstall.value || isIos.value) && !isStandalone.value
  )

  async function install() {
    if (isStandalone.value) {
      return
    }

    if (isIos.value) {
      showIosModal.value = true
      return
    }

    const prompt = deferredPrompt.value

    if (!prompt) {
      return
    }

    try {
      await prompt.prompt()
      await prompt.userChoice
    } finally {
      // The prompt can only be used once; clear it regardless of the outcome.
      deferredPrompt.value = null
    }
  }

  return {
    isIos,
    isStandalone,
    canInstall,
    showInstallOption,
    showIosModal,
    install,
  }
}
