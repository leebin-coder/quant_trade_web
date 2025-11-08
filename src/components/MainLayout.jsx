import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, theme, Dropdown, Avatar, Modal } from 'antd'
import {
  DashboardOutlined,
  LineChartOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  StockOutlined,
  LogoutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BookOutlined,
} from '@ant-design/icons'
import AIFloatingBall from './AIFloatingBall'
import KnowledgeBasePanel from './KnowledgeBasePanel'
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
    label: '市场行情',
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 计算当前是否应该展开
  const shouldExpand = !collapsed || isHovering

  // 计算右侧内容区域的左边距
  const contentMarginLeft = isFullscreen ? 0 : (shouldExpand ? 200 : 70)

  // 切换全屏
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 监听ESC键退出全屏
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

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
    <Layout style={{ minHeight: '100vh', height: '100vh', background: '#f5f5f7', overflow: 'hidden' }}>
      {/* 全屏提示 */}
      <div className={`fullscreen-tip ${isFullscreen ? 'show' : ''}`}>
        <div className="fullscreen-tip-key">ESC</div>
        <div className="fullscreen-tip-text">退出全屏</div>
      </div>

      {/* 侧边栏 */}
      <Sider
        width={shouldExpand ? 200 : 70}
        collapsedWidth={70}
        collapsed={!shouldExpand}
        trigger={null}
        className="custom-sider"
        style={{
          position: 'fixed',
          left: isFullscreen ? -80 : 0,
          top: 0,
          bottom: 0,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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
          marginLeft: contentMarginLeft,
          transition: 'margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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
            position: 'fixed',
            top: isFullscreen ? -48 : 0,
            left: contentMarginLeft,
            right: 0,
            zIndex: 999,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 600, color: '#1d1d1f' }}>
            {menuItems.find(item => item.key === location.pathname)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            <div
              className="knowledge-base-btn"
              onClick={() => setShowKnowledgeBase(true)}
              title="知识库"
            >
              <BookOutlined style={{ fontSize: '18px', fontWeight: 'bold' }} />
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
            <div
              className="fullscreen-btn"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <FullscreenExitOutlined style={{ fontSize: '16px' }} />
              ) : (
                <FullscreenOutlined style={{ fontSize: '16px' }} />
              )}
            </div>
          </div>
        </Header>
        <Content style={{
          margin: isFullscreen ? '0' : '12px',
          marginTop: isFullscreen ? '0' : '60px',
          padding: 0,
          height: isFullscreen ? '100vh' : 'calc(100vh - 72px)',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div
            className="content-area"
            style={{
              padding: 24,
              height: '100%',
              background: '#ffffff',
              borderRadius: isFullscreen ? 0 : 8,
              boxShadow: isFullscreen ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.06)',
              overflow: 'auto',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>

      {/* AI悬浮球 */}
      <AIFloatingBall />

      {/* 知识库面板 */}
      <KnowledgeBasePanel
        visible={showKnowledgeBase}
        onClose={() => setShowKnowledgeBase(false)}
      />
    </Layout>
  )
}

export default MainLayout
