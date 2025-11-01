import { useState } from 'react'
import { Tabs, Tag } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import MarketSelector from '../components/MarketSelector'
import './Quotes.css'

function Quotes() {
  const [activeKey, setActiveKey] = useState('trading')
  const [selectedStockCode, setSelectedStockCode] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState(null)
  const [justDroppedIndex, setJustDroppedIndex] = useState(null)

  const tabItems = [
    { key: 'trading', label: '交易数据' },
    { key: 'technical', label: '派生技术指标' },
    { key: 'capital', label: '资金' },
    { key: 'fundamental', label: '基本面' },
    { key: 'sentiment', label: '市场环境与情绪' },
    { key: 'future', label: '未来何往' },
  ]

  const marketSelector = MarketSelector()

  // 处理股票卡片点击
  const handleStockCardClick = (stockCode) => {
    setSelectedStockCode(stockCode)
  }

  // 处理删除股票
  const handleRemoveStock = (e, stockCode) => {
    e.stopPropagation() // 阻止冒泡，避免触发选中
    marketSelector.removeStock(stockCode)
    if (selectedStockCode === stockCode) {
      setSelectedStockCode(null)
    }
  }

  // 拖拽开始
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  // 拖拽经过
  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDraggedOverIndex(index)
  }

  // 拖拽结束
  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const items = [...marketSelector.selectedStocks]
    const draggedItem = items[draggedIndex]
    items.splice(draggedIndex, 1)
    items.splice(dropIndex, 0, draggedItem)

    // 更新股票列表（需要通过MarketSelector暴露的方法）
    marketSelector.setSelectedStocks(items)
    setDraggedIndex(null)
    setDraggedOverIndex(null)
  }

  // 拖拽离开
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDraggedOverIndex(null)
  }

  return (
    <div className="quotes-container">
      {/* Tab Bar - 顶部居中 */}
      <div className="quotes-tabs-wrapper">
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          centered
          className="quotes-tabs"
          items={tabItems.map(item => ({
            key: item.key,
            label: item.label,
            children: (
              <div className="tab-content">
                <div className="tab-content-placeholder">
                  {item.label}
                </div>
              </div>
            ),
          }))}
        />
      </div>

      {/* 悬浮：股票选择器 */}
      <div className="floating-selector">
        {marketSelector.dropdown}
      </div>

      {/* 悬浮：选中的股票标签列表 */}
      {marketSelector.selectedStocks.length > 0 && (
        <div className="floating-stocks-list">
          {marketSelector.selectedStocks.map((stock, index) => (
            <div
              key={stock.stockCode}
              draggable
              className={`selected-stock-tag ${selectedStockCode === stock.stockCode ? 'active' : ''} ${stock.trend === 'up' ? 'trend-up' : 'trend-down'} ${draggedIndex === index ? 'dragging' : ''} ${draggedOverIndex === index && draggedIndex !== index ? 'drag-over' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleStockCardClick(stock.stockCode)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="stock-tag-content">
                <div className="stock-tag-name">{stock.stockName}</div>
                <div className="stock-tag-code-row">
                  <span className="stock-tag-code">{stock.stockCode}</span>
                  <Tag
                    color={marketSelector.getExchangeColor(stock.exchange)}
                    className="stock-tag-exchange"
                  >
                    {stock.exchange}
                  </Tag>
                </div>
              </div>
              <CloseOutlined
                className="stock-tag-close"
                onClick={(e) => handleRemoveStock(e, stock.stockCode)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Quotes
