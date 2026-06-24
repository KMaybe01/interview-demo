import { useRef } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../stores"
import { getAccessToken, isTokenExpired } from "../utils/token.ts"

export default function AuthGuard() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const setUser = useAuthStore((s) => s.setUser)
  const initRef = useRef(false)

  if (!initRef.current) {
    initRef.current = true
    const token = getAccessToken()
    if (token && !isTokenExpired(token)) {
      setUser({ sub: "user_001", role: "admin" })
    }
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
