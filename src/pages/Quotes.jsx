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
  const [loadingMore, setLoadingMore] = useState(false)
  const allDataRef = useRef([])
  const earliestDateRef = useRef(null)

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

  // 查询日线数据（初次加载只查询一年）
  const fetchStockDaily = async (stockCode, isLoadMore = false) => {
    if (!stockCode) return

    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      // 计算日期范围
      let endDate, startDate
      if (isLoadMore && earliestDateRef.current) {
        // 加载更多：从最早日期往前推一年
        const earliestDateObj = new Date(earliestDateRef.current)
        endDate = new Date(earliestDateObj)
        endDate.setDate(endDate.getDate() - 1) // 结束日期是最早日期的前一天
        endDate = endDate.toISOString().split('T')[0]

        earliestDateObj.setFullYear(earliestDateObj.getFullYear() - 1)
        startDate = earliestDateObj.toISOString().split('T')[0]
      } else {
        // 初次加载：默认查询一年
        const today = new Date()
        endDate = today.toISOString().split('T')[0]
        const oneYearAgo = new Date(today)
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        startDate = oneYearAgo.toISOString().split('T')[0]
      }

      console.log(`${isLoadMore ? '加载更多' : '初次加载'}日线数据:`, { stockCode, startDate, endDate })

      const response = await stockDailyAPI.queryStockDaily({
        stockCode: stockCode,
        startDate: startDate,
        endDate: endDate,
        sortOrder: 'asc',
      })

      if (response.code === 200 && response.data && response.data.length > 0) {
        const newData = response.data.map(item => ({
          time: item.tradeDate,
          open: parseFloat(item.openPrice),
          high: parseFloat(item.highPrice),
          low: parseFloat(item.lowPrice),
          close: parseFloat(item.closePrice),
          volume: parseFloat(item.volume),
        }))

        console.log('K线数据加载成功:', {
          isLoadMore,
          count: newData.length,
          dateRange: `${newData[0]?.time} ~ ${newData[newData.length - 1]?.time}`,
        })

        if (isLoadMore) {
          // 加载更多：将新数据插入到前面
          const mergedData = [...newData, ...allDataRef.current]
          allDataRef.current = mergedData
          setChartData(mergedData)
          console.log('合并后总数据量:', mergedData.length)
        } else {
          // 初次加载
          allDataRef.current = newData
          setChartData(newData)
        }

        // 更新最早日期
        if (newData.length > 0) {
          earliestDateRef.current = newData[0].time
        }
      } else {
        console.log('查询结果为空:', response)
        if (!isLoadMore) {
          message.info('暂无数据')
          setChartData([])
        } else {
          message.info('没有更多历史数据了')
        }
      }
    } catch (error) {
      console.error('查询日线数据失败:', error)
      if (!isLoadMore) {
        message.error('查询失败，请稍后重试')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 加载更多历史数据
  const handleLoadMore = async () => {
    if (!selectedStockCode || loadingMore) return Promise.resolve()
    return fetchStockDaily(selectedStockCode, true)
  }

  // 当选中股票改变时，加载数据
  useEffect(() => {
    if (selectedStockCode) {
      allDataRef.current = []
      earliestDateRef.current = null
      setChartData([])
      fetchStockDaily(selectedStockCode, false)
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
                        <div style={{ padding: '20px' }}>
                          <StockChart
                            data={chartData}
                            height={600}
                            title={`${selectedStockCode} - ${getSelectedStockName()}`}
                            onLoadMore={handleLoadMore}
                          />
                          {loadingMore && (
                            <div style={{ textAlign: 'center', marginTop: '10px', color: '#1890ff' }}>
                              正在加载更多历史数据...
                            </div>
                          )}
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
