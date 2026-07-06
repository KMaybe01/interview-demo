import { useCallback, useSyncExternalStore } from 'react'

const THEME_KEY = 'theme'

function getSnapshot(): string {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(() => callback())
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot)

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem(THEME_KEY, next)
  }, [theme])

  return { theme, toggleTheme }
}
