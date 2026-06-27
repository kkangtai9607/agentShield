import { Layout, Menu } from 'antd'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import SystemStatusBar from './components/SystemStatusBar'
import Dashboard from './pages/Dashboard'
import AgentChat from './pages/AgentChat'
import ScenarioDemo from './pages/ScenarioDemo'
import AuditLogs from './pages/AuditLogs'
import AgentIntegrations from './pages/AgentIntegrations'
import PolicyCenter from './pages/PolicyCenter'
import Login from './pages/Login'
import IntegrationGuide from './pages/IntegrationGuide'
import Benchmark from './pages/Benchmark'
import { ProfileProvider } from './context/ProfileContext'
import { getToken } from './utils/auth'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/', label: <Link to="/">仪表盘</Link> },
  { key: '/chat', label: <Link to="/chat">Agent 对话</Link> },
  { key: '/integrations', label: <Link to="/integrations">框架演示</Link> },
  { key: '/integration-guide', label: <Link to="/integration-guide">快速集成</Link> },
  { key: '/scenarios', label: <Link to="/scenarios">攻击演示</Link> },
  { key: '/benchmark', label: <Link to="/benchmark">Benchmark</Link> },
  { key: '/audit', label: <Link to="/audit">审计日志</Link> },
  { key: '/policy', label: <Link to="/policy">策略中心</Link> },
]

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function AppLayout() {
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: '#fff', padding: 16, fontWeight: 'bold', fontSize: 16 }}>
          AgentShield
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600 }}>面向大模型智能体工具调用的安全防护网关</span>
          <SystemStatusBar />
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<AgentChat />} />
            <Route path="/integrations" element={<AgentIntegrations />} />
            <Route path="/integration-guide" element={<IntegrationGuide />} />
            <Route path="/scenarios" element={<ScenarioDemo />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/policy" element={<PolicyCenter />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <ProfileProvider>
              <AppLayout />
            </ProfileProvider>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
