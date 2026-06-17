import { App as AntApp, ConfigProvider, Spin } from "antd"
import { Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import MainLayout from "./layouts/MainLayout.tsx"
import { routes } from "./routes/index.tsx"

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
            <Route element={<MainLayout />}>
              {routes.map((r) => (
                <Route key={r.path} path={r.path} element={<r.element />} />
              ))}
            </Route>
          </Routes>
        </Suspense>
      </AntApp>
    </ConfigProvider>
  )
}
