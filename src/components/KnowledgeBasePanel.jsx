import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Dropdown, Spin } from 'antd'
import {
  CloseOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ExportOutlined,
  DownOutlined,
  BookOutlined,
  CaretRightFilled,
  CaretLeftFilled,
  CaretUpOutlined,
  CaretDownOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import KnowledgeBaseTree from './KnowledgeBaseTree'
import { knowledgeBaseConfig } from '../config/knowledgeBase'
import './KnowledgeBasePanel.css'

// 默认侧边栏宽度
const DEFAULT_SIDEBAR_WIDTH = 260
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 500

// 知识库列表配置
const knowledgeBases = [
  {
    key: 'system',
    label: '系统知识库',
    icon: <BookOutlined />,
    config: knowledgeBaseConfig,
  },
  {
    key: 'user',
    label: '用户知识库(敬请期待)',
    icon: <BookOutlined />,
    disabled: true,
  },
]

// 递归查找第一个有URL的节点
const findFirstNodeWithUrl = (nodes) => {
  for (const node of nodes) {
    if (node.url) {
      return node
    }
    if (node.children) {
      const found = findFirstNodeWithUrl(node.children)
      if (found) return found
    }
  }
  return null
}

function KnowledgeBasePanel({ visible, onClose }) {
  const [selectedNode, setSelectedNode] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentKB, setCurrentKB] = useState('system')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('kb-sidebar-width')
    return saved ? parseInt(saved) : DEFAULT_SIDEBAR_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const [showToggleBtn, setShowToggleBtn] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(false)

  const treeRef = useRef(null)
  const resizeRef = useRef(null)
  const hideTimerRef = useRef(null)

  // 获取当前知识库配置
  const currentKBConfig = knowledgeBases.find(kb => kb.key === currentKB)?.config || knowledgeBaseConfig
  const currentKBLabel = knowledgeBases.find(kb => kb.key === currentKB)?.label || '系统知识库'

  // 打开面板时自动选中第一个节点
  useEffect(() => {
    if (visible && !selectedNode) {
      const firstNode = findFirstNodeWithUrl(currentKBConfig)
      if (firstNode) {
        setSelectedNode(firstNode)
      }
    }
  }, [visible, currentKB])

  // 重置状态当面板关闭时
  useEffect(() => {
    if (!visible) {
      setIsFullscreen(false)
      setSelectedNode(null)
      setSidebarCollapsed(false)
    }
  }, [visible])

  // ESC键退出全屏
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    if (visible) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, isFullscreen])

  const handleTreeSelect = (node) => {
    setSelectedNode(node)
    setIframeLoading(true)
  }

  const handleOpenInNewTab = () => {
    if (selectedNode?.url) {
      window.open(selectedNode.url, '_blank')
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleClose = () => {
    setIsFullscreen(false)
    onClose()
  }

  const handleIframeLoad = () => {
    setIframeLoading(false)
  }

  const handleExpandAll = () => {
    treeRef.current?.expandAll()
  }

  const handleCollapseAll = () => {
    treeRef.current?.collapseAll()
  }

  const handleLocateCurrent = () => {
    if (selectedNode) {
      treeRef.current?.locateNode(selectedNode.id)
    }
  }

  const handleKBChange = ({ key }) => {
    if (key !== 'user') {
      setCurrentKB(key)
      setSelectedNode(null)
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // 鼠标进入分界线区域
  const handleResizeMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setShowToggleBtn(true)
  }

  // 鼠标离开分界线区域
  const handleResizeMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      if (!isResizing) {
        setShowToggleBtn(false)
      }
    }, 1000)
  }

  // 开始拖拽
  const handleResizeStart = (e) => {
    if (sidebarCollapsed) return
    e.preventDefault()
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // 拖拽中 - 使用 RAF 优化性能
  useEffect(() => {
    if (!isResizing) return

    let rafId = null

    const handleMouseMove = (e) => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        const newWidth = e.clientX
        if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(newWidth)
        }
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      // 保存到 localStorage
      localStorage.setItem('kb-sidebar-width', sidebarWidth.toString())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [isResizing, sidebarWidth])

  // 计算面板尺寸
  const panelWidth = isFullscreen ? '100vw' : '90vw'
  const panelHeight = isFullscreen ? '100vh' : '90vh'

  // 知识库下拉菜单
  const kbMenuItems = knowledgeBases.map(kb => ({
    key: kb.key,
    label: kb.label,
    icon: kb.icon,
    disabled: kb.disabled,
  }))

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      closable={false}
      width={panelWidth}
      centered
      bodyStyle={{
        padding: 0,
        height: panelHeight,
        overflow: 'hidden',
      }}
      className="knowledge-base-modal"
      styles={{
        mask: { backdropFilter: 'blur(8px)' },
      }}
      transitionName=""
      maskTransitionName=""
    >
      <div className="knowledge-base-panel">
        {/* 顶部工具栏 */}
        <div className="panel-header">
          <div className="panel-title">
            {currentKBLabel}
            {selectedNode && (
              <>
                <span className="title-divider">|</span>
                {selectedNode.title}
              </>
            )}
          </div>
          <div className="panel-actions">
            <Button
              type="text"
              icon={<ExportOutlined />}
              onClick={handleOpenInNewTab}
              className="action-btn action-btn-export"
              title="在新窗口打开"
              disabled={!selectedNode}
            />
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              className="action-btn action-btn-fullscreen"
              title={isFullscreen ? '退出全屏' : '全屏'}
            />
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleClose}
              className="action-btn close-btn"
              title="关闭"
            />
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="panel-body">
          {/* 收起时的展开按钮 */}
          {sidebarCollapsed && (
            <div className="sidebar-expand-btn" onClick={toggleSidebar}>
              <CaretRightFilled />
            </div>
          )}

          {/* 左侧树形导航 */}
          <div
            className={`panel-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}
            style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
          >
            <div className="sidebar-header">
              {/* 知识库选择器 */}
              <Dropdown
                menu={{ items: kbMenuItems, onClick: handleKBChange }}
                trigger={['click']}
                placement="bottomLeft"
              >
                <div className="sidebar-kb-selector" title="切换知识库">
                  <BookOutlined className="sidebar-kb-icon" />
                  <DownOutlined className="sidebar-kb-arrow" />
                </div>
              </Dropdown>

              {/* 控制按钮组 */}
              <div className="sidebar-actions">
                <Button
                  type="text"
                  size="small"
                  onClick={handleExpandAll}
                  className="sidebar-action-btn"
                  title="全部展开"
                >
                  <div className="expand-icon">
                    <CaretUpOutlined />
                    <CaretDownOutlined />
                  </div>
                </Button>
                <Button
                  type="text"
                  size="small"
                  onClick={handleCollapseAll}
                  className="sidebar-action-btn"
                  title="全部收起"
                >
                  <div className="collapse-icon">
                    <CaretDownOutlined />
                    <CaretUpOutlined />
                  </div>
                </Button>
                <Button
                  type="text"
                  size="small"
                  onClick={handleLocateCurrent}
                  className="sidebar-action-btn"
                  icon={<EnvironmentOutlined />}
                  title="定位当前"
                  disabled={!selectedNode}
                />
              </div>
            </div>
            <KnowledgeBaseTree
              ref={treeRef}
              data={currentKBConfig}
              onSelect={handleTreeSelect}
              selectedKey={selectedNode?.id}
            />
          </div>

          {/* 分界线和拖拽区域 */}
          {!sidebarCollapsed && (
            <div
              ref={resizeRef}
              className="sidebar-resize-handle"
              onMouseEnter={handleResizeMouseEnter}
              onMouseLeave={handleResizeMouseLeave}
              onMouseDown={handleResizeStart}
            >
              {/* 收起按钮 */}
              {showToggleBtn && (
                <div
                  className="sidebar-toggle-btn"
                  onClick={toggleSidebar}
                  title="收起侧边栏"
                >
                  <CaretLeftFilled />
                </div>
              )}
            </div>
          )}

          {/* 右侧内容展示 */}
          <div className="panel-content">
            {selectedNode ? (
              <div className="iframe-container">
                {iframeLoading && (
                  <div className="iframe-loading">
                    <Spin size="large" tip="加载中..." />
                  </div>
                )}
                <iframe
                  src={selectedNode.url}
                  title={selectedNode.title}
                  className="content-iframe"
                  onLoad={handleIframeLoad}
                  style={{ opacity: iframeLoading ? 0 : 1 }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default KnowledgeBasePanel
