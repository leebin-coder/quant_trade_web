# 知识库功能更新 v1.3

## 重大更新

### 1. 顶部布局重构 🎯

**改进前**:
```
知识库选择 | 页面标题    [导出][全屏][关闭]
```

**改进后**:
```
系统知识库 | 当前文档名    [知识库▼][导出][全屏][关闭]
```

**变化说明**:
- ✅ 知识库选择器移至右侧,与其他功能按钮对齐
- ✅ 标题显示格式: `知识库名 | 文档名`
- ✅ 分隔符使用竖线 `|` ,视觉清晰
- ✅ 未选择文档时只显示知识库名
- ✅ 知识库选择器样式与其他按钮统一

### 2. 智能侧边栏控制 📂

#### 2.1 悬浮显示收起按钮
- **触发方式**: 鼠标悬停在左侧菜单与内容区的分界线上
- **显示时机**: 立即显示
- **隐藏时机**: 鼠标离开后延迟1秒自动隐藏
- **拖拽时**: 保持显示状态

**视觉效果**:
```
正常状态:        悬浮状态:
│               │ ◄  ← 收起按钮
│               │    (淡入动画)
```

#### 2.2 优化的收起/展开按钮

**收起按钮** (分界线上显示):
- 图标: ◄ (CaretLeftFilled 实心左箭头)
- 尺寸: 16px × 40px (扁平设计)
- 位置: 紧贴分界线,垂直居中
- 样式: 白色背景 + 细边框 + 阴影
- 动画: 淡入效果 (fadeIn 0.2s)

**展开按钮** (收起后左侧显示):
- 图标: ► (CaretRightFilled 实心右箭头)
- 尺寸: 16px × 40px
- 位置: 最左侧,垂直居中
- 样式: 半圆形,右侧圆角
- 悬浮: 宽度增加到18px

**和谐设计**:
- 展开/收起按钮图标对应(左右箭头)
- 尺寸一致,扁平设计
- 颜色: 默认灰色,悬浮时蓝色
- 与侧边栏控制按钮(▣▢⊙)风格统一

### 3. 可拖拽调整侧边栏宽度 🖱️

**功能描述**:
- 鼠标悬停在分界线上时,光标变为 `col-resize`
- 按住鼠标左键可拖拽调整侧边栏宽度
- 拖拽过程中实时预览宽度变化
- 松开鼠标后应用新宽度

**宽度限制**:
- 最小宽度: 200px
- 最大宽度: 500px
- 默认宽度: 260px

**持久化**:
- 使用 `localStorage` 保存用户设置的宽度
- 存储键: `kb-sidebar-width`
- 下次打开自动应用上次设置的宽度

**视觉反馈**:
```
拖拽前:         拖拽中:          拖拽后:
│               │                ││
│  260px        │  320px ←→     ││ 320px
│               │  (动态)        ││
```

**分界线样式**:
- 宽度: 8px (便于拖拽)
- 悬浮时背景: 淡蓝色
- 中间有1px的细线作为视觉指引

### 4. 移除空状态提示 🗑️

**改进前**:
```
┌─────────────────┐
│                 │
│   📖            │
│ 请从左侧选择... │
│                 │
└─────────────────┘
```

**改进后**:
```
┌─────────────────┐
│                 │
│                 │
│     (空白)      │
│                 │
└─────────────────┘
```

- 未选择节点时不显示任何提示文字
- 保持内容区域纯白,更简洁
- 符合macOS极简设计理念

### 5. iframe 加载动画 ⏳

**实现方式**:
- 使用 Ant Design 的 `<Spin>` 组件
- 加载状态管理: `iframeLoading`
- 监听 iframe 的 `onLoad` 事件

**视觉效果**:
```
加载中:                 加载完成:
┌─────────────┐        ┌─────────────┐
│             │        │             │
│  ⌛ 加载中...│   →    │  网页内容   │
│             │        │             │
└─────────────┘        └─────────────┘
```

**样式特点**:
- 居中显示
- 蓝色加载图标
- "加载中..."提示文字(13px,灰色)
- 加载完成后淡出(0.3s opacity)
- iframe 在加载时透明度为0,加载完成后淡入

**优化点**:
- 每次切换节点时重新显示加载动画
- 防止用户看到空白或旧内容
- 提供更好的等待反馈

## 技术实现

### 新增状态管理

```jsx
const [sidebarWidth, setSidebarWidth] = useState(() => {
  const saved = localStorage.getItem('kb-sidebar-width')
  return saved ? parseInt(saved) : DEFAULT_SIDEBAR_WIDTH
})
const [isResizing, setIsResizing] = useState(false)
const [showToggleBtn, setShowToggleBtn] = useState(false)
const [iframeLoading, setIframeLoading] = useState(false)
```

### 拖拽调整宽度

```jsx
// 开始拖拽
const handleResizeStart = (e) => {
  setIsResizing(true)
  document.body.style.cursor = 'col-resize'
}

// 拖拽中
useEffect(() => {
  if (!isResizing) return

  const handleMouseMove = (e) => {
    const newWidth = e.clientX
    if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
      setSidebarWidth(newWidth)
      localStorage.setItem('kb-sidebar-width', newWidth.toString())
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
    document.body.style.cursor = ''
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  return () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
}, [isResizing])
```

### 延迟隐藏按钮

```jsx
// 鼠标离开分界线
const handleResizeMouseLeave = () => {
  hideTimerRef.current = setTimeout(() => {
    if (!isResizing) {
      setShowToggleBtn(false)
    }
  }, 1000) // 1秒延迟
}

// 鼠标进入分界线
const handleResizeMouseEnter = () => {
  if (hideTimerRef.current) {
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = null
  }
  setShowToggleBtn(true)
}
```

### iframe 加载控制

```jsx
const handleTreeSelect = (node) => {
  setSelectedNode(node)
  setIframeLoading(true) // 开始加载
}

const handleIframeLoad = () => {
  setIframeLoading(false) // 加载完成
}

<iframe
  src={selectedNode.url}
  onLoad={handleIframeLoad}
  style={{ opacity: iframeLoading ? 0 : 1 }}
/>
```

## CSS 关键样式

### 分界线拖拽区域
```css
.sidebar-resize-handle {
  width: 8px;
  cursor: col-resize;
  position: relative;
}

.sidebar-resize-handle::before {
  content: '';
  width: 1px;
  background: rgba(0, 0, 0, 0.06);
}
```

### 收起按钮
```css
.sidebar-toggle-btn {
  width: 16px;
  height: 40px;
  border-radius: 4px;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```

### 展开按钮
```css
.sidebar-expand-btn {
  position: absolute;
  left: 0;
  width: 16px;
  height: 40px;
  border-radius: 0 4px 4px 0;
}

.sidebar-expand-btn:hover {
  width: 18px;
}
```

## 用户体验提升

1. **直观的拖拽调整**: 用户可以根据内容和屏幕尺寸自定义侧边栏宽度
2. **智能按钮显示**: 不常用的收起按钮仅在需要时显示,减少视觉干扰
3. **记忆用户偏好**: 记住宽度设置,无需每次调整
4. **流畅的加载反馈**: 清晰的加载状态,避免用户疑惑
5. **精简的界面**: 移除冗余提示,保持界面简洁

## 兼容性

- localStorage API (所有现代浏览器)
- Mouse Events (拖拽功能)
- CSS动画和过渡

## 下一步计划

- [ ] 记忆侧边栏展开/收起状态
- [ ] 支持双击分界线重置宽度
- [ ] 添加键盘快捷键(Cmd+B 切换侧边栏)
- [ ] 优化拖拽时的性能(节流)

---

**更新时间**: 2025-01-08
**版本**: v1.3
**兼容性**: 向下兼容 v1.0, v1.1, v1.2
