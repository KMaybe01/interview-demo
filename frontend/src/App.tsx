import { App as AntApp, ConfigProvider, Spin } from "antd"
import { Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import AuthGuard from "./components/AuthGuard.tsx"
import PageTracker from "./components/PageTracker.tsx"
import MainLayout from "./layouts/MainLayout.tsx"
import Login from "./pages/Login.tsx"
import { routes } from "./routes"

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <Suspense fallback={<Spin style={{ position: "fixed", top: "50%", left: "50%" }} />}>
          <Routes>
            <Route
              path="/login"
              element={
                <PageTracker>
                  <Login />
                </PageTracker>
              }
            />
            <Route element={<AuthGuard />}>
              <Route element={<MainLayout />}>
                {routes.map((r) => (
                  <Route
                    key={r.path}
                    path={r.path}
                    element={
                      <PageTracker>
                        <r.element />
                      </PageTracker>
                    }
                  />
                ))}
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AntApp>
    </ConfigProvider>
  )
}
