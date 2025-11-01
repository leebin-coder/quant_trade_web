import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Dropdown, Avatar, Modal } from 'antd'
import {
  DashboardOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  StockOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import './MainLayout.css'

const { Header, Content, Sider } = Layout

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/quotes',
    icon: <StockOutlined />,
    label: '行情',
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
  const [collapsed, setCollapsed] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 计算当前是否应该展开
  const shouldExpand = !collapsed || isHovering

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
    <Layout style={{ minHeight: '100vh', background: '#f5f5f7' }}>
      {/* 侧边栏 */}
      <Sider
        width={shouldExpand ? 200 : 70}
        collapsedWidth={70}
        collapsed={!shouldExpand}
        trigger={null}
        className="custom-sider"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="sider-content">
          {/* Logo */}
          <div className="sider-logo">
            <span style={{
              display: 'inline-block',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: shouldExpand ? 0 : 1,
              transform: shouldExpand ? 'scale(0.5)' : 'scale(1)',
              position: 'absolute',
            }}>
              CC
            </span>
            <span style={{
              display: 'inline-block',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: shouldExpand ? 1 : 0,
              transform: shouldExpand ? 'scale(1)' : 'scale(0.5)',
              whiteSpace: 'nowrap',
            }}>
              Chinese Chives
            </span>
          </div>

          {/* 菜单 */}
          <Menu
            selectedKeys={[location.pathname]}
            mode="inline"
            items={menuItems}
            onClick={handleMenuClick}
            className="sidebar-menu"
            inlineCollapsed={!shouldExpand}
          />
        </div>
      </Sider>
      <Layout
        style={{
          background: '#f5f5f7',
          marginLeft: 70,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Header
          style={{
            height: 48,
            lineHeight: '48px',
            padding: '0 32px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f' }}>
            {menuItems.find(item => item.key === location.pathname)?.label}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'
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
              <span style={{ fontSize: '14px', color: '#1d1d1f', fontWeight: 500 }}>
                {displayName}
              </span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '20px', padding: 0 }}>
          <div
            style={{
              padding: 24,
              minHeight: 'calc(100vh - 108px)',
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
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
