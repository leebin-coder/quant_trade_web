import { useState, useRef, useEffect } from 'react'
import { RobotOutlined } from '@ant-design/icons'
import './AIFloatingBall.css'

function AIFloatingBall() {
  const normalSize = 48
  const initialSize = 58
  const ballMargin = 10

  const [position, setPosition] = useState({
    x: window.innerWidth - initialSize - 100,
    y: window.innerHeight - initialSize - 100
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isAnimating, setIsAnimating] = useState(true)
  const [currentSize, setCurrentSize] = useState(58)
  const [isDimmed, setIsDimmed] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [showText, setShowText] = useState(true)
  const isTransitioningRef = useRef(false)
  const ballRef = useRef(null)
  const popupRef = useRef(null)

  // 初始弹跳动画
  useEffect(() => {
    // 弹跳动画持续时间
    const bounceDelay = 2000 // 2秒弹跳

    const bounceTimer = setTimeout(() => {
      // 弹跳结束后滑落到最终位置
      setIsAnimating(true)
      const targetX = window.innerWidth - normalSize - 20
      const targetY = window.innerHeight - normalSize - 20

      setTimeout(() => {
        setPosition({ x: targetX, y: targetY })
        setCurrentSize(normalSize)
      }, 100)

      // 动画结束
      setTimeout(() => {
        setIsAnimating(false)
      }, 1100)
    }, bounceDelay)

    return () => clearTimeout(bounceTimer)
  }, [])

  // 处理拖拽开始
  const handleMouseDown = (e) => {
    if (e.target.closest('.ai-popup')) return // 点击弹窗内容不触发拖拽
    if (isAnimating) return // 动画期间不允许拖拽

    setIsDragging(true)
    setIsPopupOpen(false) // 拖动时关闭弹框
    const rect = ballRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  // 处理拖拽移动
  const handleMouseMove = (e) => {
    if (!isDragging) return

    const sidebarWidth = 70
    const headerHeight = 48

    let newX = e.clientX - dragOffset.x
    let newY = e.clientY - dragOffset.y

    // 限制在可拖拽区域内，保持10px margin
    newX = Math.max(sidebarWidth + ballMargin, Math.min(newX, window.innerWidth - currentSize - ballMargin))
    newY = Math.max(headerHeight + ballMargin, Math.min(newY, window.innerHeight - currentSize - ballMargin))

    setPosition({ x: newX, y: newY })
  }

  // 处理拖拽结束
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 处理点击
  const handleClick = (e) => {
    e.stopPropagation()
    e.preventDefault()

    console.log('点击触发，当前状态：', {
      isDragging,
      isTransitioning: isTransitioningRef.current,
      isPopupOpen,
      isDimmed,
      showPopup
    })

    // 使用ref立即阻止重复点击
    if (isDragging || isTransitioningRef.current) {
      console.log('点击被拦截')
      return
    }

    // 立即设置过渡锁，防止重复点击
    isTransitioningRef.current = true

    // 使用当前的真实状态来判断，而不是依赖state
    const shouldOpen = !isPopupOpen && !showPopup

    if (shouldOpen) {
      console.log('执行打开逻辑')
      // 打开弹框：小球变暗淡，AI字体消散，弹框展开
      setShowText(false)
      setIsDimmed(true)
      setTimeout(() => {
        setIsPopupOpen(true)
        setShowPopup(true)
        // 延迟解锁，确保动画完成
        setTimeout(() => {
          isTransitioningRef.current = false
          console.log('打开动画完成，解锁')
        }, 200)
      }, 400) // 等待文字消散
    } else {
      console.log('执行关闭逻辑')
      // 关闭弹框：弹框收起，小球恢复，AI字体汇聚
      setShowPopup(false)
      setTimeout(() => {
        setIsPopupOpen(false)
        setIsDimmed(false)
        setTimeout(() => {
          setShowText(true)
          // 延迟解锁，确保动画完成
          setTimeout(() => {
            isTransitioningRef.current = false
            console.log('关闭动画完成，解锁')
          }, 200)
        }, 200) // 延迟显示文字，产生汇聚效果
      }, 300)
    }
  }

  // 点击其他地方关闭弹窗
  const handleClickOutside = (e) => {
    if (popupRef.current && !popupRef.current.contains(e.target) && !isTransitioningRef.current) {
      // 关闭弹框：弹框收起，小球恢复，AI字体汇聚
      isTransitioningRef.current = true
      setShowPopup(false)
      setTimeout(() => {
        setIsPopupOpen(false)
        setIsDimmed(false)
        setTimeout(() => {
          setShowText(true)
          isTransitioningRef.current = false
        }, 200)
      }, 300)
    }
  }

  // 监听鼠标事件
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // 监听点击外部
  useEffect(() => {
    if (isPopupOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPopupOpen])

  // 计算弹窗位置（上下、左右）
  const popupWidth = 300
  const popupHeight = 485
  const isTop = position.y < window.innerHeight / 2

  // 计算水平位置，确保弹窗不超出屏幕
  let popupLeft = position.x + currentSize / 2 - popupWidth / 2 // 默认居中

  // 如果小球在最左侧，弹窗左边缘不能超过小球左边缘
  if (position.x < 150) {
    popupLeft = position.x
  }
  // 如果小球在最右侧，弹窗右边缘不能超过小球右边缘
  else if (position.x + currentSize > window.innerWidth - 150) {
    popupLeft = position.x + currentSize - popupWidth
  }

  // 确保弹窗不超出屏幕边界
  popupLeft = Math.max(10, Math.min(popupLeft, window.innerWidth - popupWidth - 10))

  // 计算弹窗的 transform origin（相对于小球的位置）
  const ballCenterX = position.x + currentSize / 2
  const ballCenterY = position.y + currentSize / 2
  const originX = ballCenterX - popupLeft
  const popupTop = isTop ? position.y + currentSize + 10 : window.innerHeight - position.y - popupHeight + 10
  const originY = ballCenterY - popupTop

  const popupStyle = {
    position: 'fixed',
    left: `${popupLeft}px`,
    [isTop ? 'top' : 'bottom']: isTop ? position.y + currentSize + 10 : window.innerHeight - position.y + 10,
    transformOrigin: `${originX}px ${originY}px`,
  }

  return (
    <>
      {/* 悬浮小球 */}
      <div
        ref={ballRef}
        className={`ai-floating-ball ${isAnimating ? 'bouncing' : ''} ${isDimmed ? 'dimmed' : ''}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${currentSize}px`,
          height: `${currentSize}px`,
          cursor: isDragging ? 'grabbing' : (isAnimating ? 'default' : 'grab'),
          transition: isAnimating ? 'left 1s cubic-bezier(0.4, 0, 0.2, 1), top 1s cubic-bezier(0.4, 0, 0.2, 1), width 1s cubic-bezier(0.4, 0, 0.2, 1), height 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          pointerEvents: isTransitioningRef.current ? 'none' : 'auto',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <span className={`ai-text ${showText ? 'gather' : 'scatter'}`}>AI</span>
        {!showText && (
          <>
            <span className="ai-dot dot-1"></span>
            <span className="ai-dot dot-2"></span>
            <span className="ai-dot dot-3"></span>
            <span className="ai-dot dot-4"></span>
            <span className="ai-dot dot-5"></span>
            <span className="ai-dot dot-6"></span>
          </>
        )}
      </div>

      {/* 弹窗 */}
      {isPopupOpen && (
        <div ref={popupRef} className={`ai-popup ${showPopup ? 'show' : 'hide'}`} style={popupStyle}>
          <div className="ai-popup-content">
            <div className="ai-popup-row1">
              <RobotOutlined className="ai-robot-icon" />
              <span className="ai-popup-text1">功能开发中</span>
            </div>
            <div className="ai-popup-row2">敬请期待</div>
          </div>
        </div>
      )}
    </>
  )
}

export default AIFloatingBall
