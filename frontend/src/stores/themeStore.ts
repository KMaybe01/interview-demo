import { create } from "zustand"

type ThemeMode = "light" | "dark"

interface ThemeState {
  mode: ThemeMode
  toggle: () => void
}

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem("theme-mode")
    return stored === "dark" ? "dark" : "light"
  } catch {
    return "light"
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: getInitialMode(),
  toggle: () => {
    set((s) => {
      const next = s.mode === "light" ? "dark" : "light"
      localStorage.setItem("theme-mode", next)
      return { mode: next }
    })
  },
}))
