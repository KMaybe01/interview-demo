import { Layout, Menu, Typography } from "antd"
import { useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { routes } from "../routes"

const { Header, Sider, Content } = Layout
const { Title } = Typography

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = routes.map((r) => ({
    key: r.path,
    icon: <r.icon />,
    label: r.name,
  }))

  return (
    <Layout style={{ height: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={220}
        style={{
          overflow: "hidden",
          borderRight: "1px solid #f0f0f0",
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Title level={5} style={{ color: "#1677ff", margin: 0, whiteSpace: "nowrap" }}>
            {collapsed ? "Demo" : "Interview Demo"}
          </Title>
        </div>
        <div style={{ overflow: "auto", height: "calc(100vh - 64px)" }}>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </div>
      </Sider>
      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            height: 64,
            lineHeight: "64px",
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            {routes.find((r) => r.path === location.pathname)?.name ?? "Interview Demo"}
          </Title>
        </Header>
        <Content style={{ padding: 24, overflow: "auto", height: "calc(100vh - 64px)" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
