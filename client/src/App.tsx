import { useEffect, useState } from 'react'
import { Layout, Menu, theme, Typography } from 'antd'
import {
  HomeOutlined,
  UserOutlined,
  GithubOutlined,
} from '@ant-design/icons'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import { fetchHealth } from './api'

const { Header, Content, Footer } = Layout
const { Text } = Typography

const navItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
  { key: '/about', icon: <UserOutlined />, label: <Link to="/about">关于</Link> },
]

function App() {
  const location = useLocation()
  const { token } = theme.useToken()
  const [serverOk, setServerOk] = useState<boolean | null>(null)

  useEffect(() => {
    fetchHealth()
      .then(() => setServerOk(true))
      .catch(() => setServerOk(false))
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Text strong style={{ fontSize: 18, whiteSpace: 'nowrap' }}>
          My Site
        </Text>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navItems}
          style={{ flex: 1, border: 'none' }}
        />
        <a href="https://github.com" target="_blank" rel="noreferrer">
          <GithubOutlined style={{ fontSize: 20 }} />
        </a>
      </Header>

      <Content style={{ padding: '32px 48px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        My Site © {new Date().getFullYear()}
        {serverOk === true && ' · 后端已连接'}
        {serverOk === false && ' · 后端未连接'}
      </Footer>
    </Layout>
  )
}

export default App
