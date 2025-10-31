import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Dropdown, Avatar, Modal } from 'antd'
import {
  DashboardOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'

const { Header, Content, Sider } = Layout

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/market',
    icon: <LineChartOutlined />,
    label: '行情监控',
  },
  {
    key: '/strategy',
    icon: <AppstoreOutlined />,
    label: '策略管理',
  },
  {
    key: '/history',
    icon: <HistoryOutlined />,
    label: '交易记录',
  },
]

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 获取用户信息，昵称默认为"韭菜+手机号后四位"
  const getDisplayName = () => {
    const nickName = localStorage.getItem('nickName')
    if (nickName && nickName !== '用户') {
      return nickName
    }
    const phone = localStorage.getItem('phone')
    if (phone && phone.length >= 4) {
      return `韭菜${phone.slice(-4)}`
    }
    return '韭菜'
  }

  const displayName = getDisplayName()

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const handleLogout = () => {
    Modal.confirm({
      title: '退出登录',
      content: '确定要退出登录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('userId')
        localStorage.removeItem('nickName')
        localStorage.removeItem('phone')
        navigate('/login')
      },
    })
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? 'CC' : 'Chinese Chives'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            {menuItems.find(item => item.key === location.pathname)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ color: '#999', fontSize: '14px' }}>
              {new Date().toLocaleString('zh-CN')}
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  transition: 'background 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Avatar
                  size="small"
                  style={{ background: '#52c41a', fontSize: '16px' }}
                >
                  🌱
                </Avatar>
                <span style={{ fontSize: '14px' }}>{displayName}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
