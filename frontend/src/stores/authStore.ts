import { create } from "zustand"
import { clearTokens, getAccessToken, isTokenExpired, parseToken } from "../utils/token.ts"

export interface UserInfo {
  sub: string
  role: string
}

interface AuthState {
  user: UserInfo | null
  isLoggedIn: boolean
  setUser: (user: UserInfo | null) => void
  login: (user: UserInfo) => void
  logout: () => void
}

function initUser(): UserInfo | null {
  const token = getAccessToken()
  if (!token) return null
  if (isTokenExpired(token)) {
    clearTokens()
    return null
  }
  const payload = parseToken(token)
  if (!payload) return null
  return { sub: payload.sub, role: payload.role }
}

const initialUser = initUser()

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isLoggedIn: initialUser != null,
  setUser: (user) => {
    set({ user, isLoggedIn: user != null })
  },
  login: (user) => {
    set({ user, isLoggedIn: true })
  },
  logout: () => {
    set({ user: null, isLoggedIn: false })
  },
}))
