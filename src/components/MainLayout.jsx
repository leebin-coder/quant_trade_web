import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Dropdown, Avatar, Modal } from 'antd'
import {
  DashboardOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  StockOutlined,
  LogoutOutlined,
  BookOutlined,
} from '@ant-design/icons'
import AIFloatingBall from './AIFloatingBall'
import KnowledgeBasePanel from './KnowledgeBasePanel'
import TradingCalendar from './TradingCalendar'
import { KnowledgeBaseProvider, useKnowledgeBase } from '../contexts/KnowledgeBaseContext'
import './MainLayout.css'

const { Header, Content } = Layout

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

function MainLayoutInner() {
  const { visible, targetNodeId, openKnowledge, closeKnowledge } = useKnowledgeBase()
  const navigate = useNavigate()
  const location = useLocation()

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
    <Layout style={{ minHeight: '100vh', height: '100vh', background: '#000000', overflow: 'hidden' }}>
      {/* 顶部导航栏 */}
      <Header
        style={{
          height: 48,
          lineHeight: '48px',
          padding: '0 32px',
          background: 'rgb(8, 8, 8)',
          backdropFilter: 'blur(20px)',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 左侧：Logo + 菜单按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Logo */}
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.5px',
          }}>
            Chinese Chives
          </div>

          {/* 菜单按钮组 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {menuItems.map(item => (
              <div
                key={item.key}
                className={`top-menu-btn ${location.pathname === item.key ? 'active' : ''}`}
                onClick={() => navigate(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：工具栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            <TradingCalendar />
            <div
              className="knowledge-base-btn"
              onClick={() => openKnowledge()}
              title="知识库"
            >
              <BookOutlined style={{ fontSize: '18px' }} />
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
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
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
                <span style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500 }}>
                  {displayName}
                </span>
              </div>
            </Dropdown>
          </div>
      </Header>

      {/* 内容区域 */}
      <Content style={{
        marginTop: '48px',
        padding: 0,
        height: 'calc(100vh - 48px)',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgb(8, 8, 8)',
      }}>
        <div
          className="content-area"
          style={{
            padding: '2px 0 0 0',
            height: '100%',
            background: 'rgb(8, 8, 8)',
            overflow: 'auto',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Outlet />
        </div>
      </Content>

      {/* AI悬浮球 */}
      <AIFloatingBall />

      {/* 知识库面板 */}
      <KnowledgeBasePanel
        visible={visible}
        targetNodeId={targetNodeId}
        onClose={closeKnowledge}
      />
    </Layout>
  )
}

function MainLayout() {
  return (
    <KnowledgeBaseProvider>
      <MainLayoutInner />
    </KnowledgeBaseProvider>
  )
}

export default MainLayout
