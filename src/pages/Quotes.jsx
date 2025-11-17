import { useState, useEffect, useRef } from 'react'
import { Tabs, Tag, Spin, message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import MarketSelector from '../components/MarketSelector'
import StockChart from '../components/StockChart'
import { stockDailyAPI } from '../services/api'
import './Quotes.css'

function Quotes() {
  const [activeKey, setActiveKey] = useState('trading')
  const [selectedStockCode, setSelectedStockCode] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState(null)
  const [justDroppedIndex, setJustDroppedIndex] = useState(null)

  // K线图相关状态
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const allDataRef = useRef([]) // 存储所有历史数据

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

  // 查询所有历史日线数据（5年5年查询直到所有数据加载完）
  const fetchAllStockDaily = async (stockCode) => {
    if (!stockCode) return

    setLoading(true)
    let allData = []

    try {
      const today = new Date()
      const endDate = today.toISOString().split('T')[0]

      // 从1990年开始查询（假设最早的股票数据）
      let currentEndDate = endDate
      let currentStartYear = today.getFullYear() - 5
      let hasMoreData = true

      console.log('开始加载所有历史数据...')

      while (hasMoreData && currentStartYear >= 1990) {
        const currentStartDate = `${currentStartYear}-01-01`

        console.log(`查询数据段: ${currentStartDate} ~ ${currentEndDate}`)

        const response = await stockDailyAPI.queryStockDaily({
          stockCode: stockCode,
          startDate: currentStartDate,
          endDate: currentEndDate,
          sortOrder: 'asc',
        })

        if (response.code === 200 && response.data && response.data.length > 0) {
          const newData = response.data.map(item => {
            const dateOnly = item.tradeDate.split(' ')[0]
            return {
              time: dateOnly,
              open: parseFloat(item.openPrice),
              high: parseFloat(item.highPrice),
              low: parseFloat(item.lowPrice),
              close: parseFloat(item.closePrice),
              volume: parseFloat(item.volume),
            }
          })

          // 将新数据插入到前面
          allData = [...newData, ...allData]
          console.log(`加载了 ${newData.length} 条数据，总计: ${allData.length} 条`)

          // 准备下一次查询
          currentEndDate = new Date(newData[0].time)
          currentEndDate.setDate(currentEndDate.getDate() - 1)
          currentEndDate = currentEndDate.toISOString().split('T')[0]
          currentStartYear -= 5
        } else {
          // 没有更多数据了
          hasMoreData = false
          console.log('已加载所有历史数据')
        }
      }

      if (allData.length > 0) {
        allDataRef.current = allData
        setChartData(allData)
        console.log('所有历史数据加载完成:', {
          总数据量: allData.length,
          日期范围: `${allData[0]?.time} ~ ${allData[allData.length - 1]?.time}`,
        })
      } else {
        message.info('暂无数据')
        setChartData([])
      }
    } catch (error) {
      console.error('查询日线数据失败:', error)
      message.error('查询失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 当选中股票改变时，加载所有数据
  useEffect(() => {
    if (selectedStockCode) {
      allDataRef.current = []
      setChartData([])
      fetchAllStockDaily(selectedStockCode)
    }
  }, [selectedStockCode])

  // 获取选中股票的名称
  const getSelectedStockName = () => {
    const stock = marketSelector.selectedStocks.find(s => s.stockCode === selectedStockCode)
    return stock ? stock.stockName : ''
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
                {item.key === 'trading' ? (
                  // 交易数据Tab - 显示K线图
                  selectedStockCode ? (
                    <Spin spinning={loading} tip="加载中...">
                      {chartData.length > 0 ? (
                        <div style={{
                          padding: '20px',
                          paddingLeft: '84px',  // 左侧边距减小到原来的30% (280px * 0.3 = 84px)
                          paddingRight: '40px',
                        }}>
                          <div style={{ width: '100%' }}>
                            <StockChart
                              data={chartData}
                              height={600}
                              title={`${getSelectedStockName()} ${selectedStockCode}`}
                            />
                          </div>
                        </div>
                      ) : (
                        !loading && (
                          <div style={{ textAlign: 'center', padding: '100px 40px', color: '#999', fontSize: '16px' }}>
                            暂无数据
                          </div>
                        )
                      )}
                    </Spin>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '100px 40px', color: '#999', fontSize: '16px' }}>
                      请点击左侧股票标签查看K线图
                    </div>
                  )
                ) : (
                  // 其他Tab - 显示占位符
                  <div className="tab-content-placeholder">
                    {item.label}
                  </div>
                )}
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
