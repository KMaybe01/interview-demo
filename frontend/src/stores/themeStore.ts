import { create } from "zustand"

type ThemeMode = "light" | "dark"

interface ThemeState {
  mode: ThemeMode
  toggle: () => void
}

const stored = localStorage.getItem("theme-mode") as ThemeMode | null

export const useThemeStore = create<ThemeState>((set) => ({
  mode: stored ?? "light",
  toggle: () =>
    { set((s) => {
      const next = s.mode === "light" ? "dark" : "light"
      localStorage.setItem("theme-mode", next)
      return { mode: next }
    }); },
}))
