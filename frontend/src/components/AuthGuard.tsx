import { Spin } from "antd"
import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../stores"
import { getAccessToken, isTokenExpired } from "../utils/token.ts"

export default function AuthGuard() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const setUser = useAuthStore((s) => s.setUser)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (token && !isTokenExpired(token)) {
      setUser({ sub: "user_001", role: "admin" })
    }
    setChecking(false)
  }, [setUser])

  if (checking) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
