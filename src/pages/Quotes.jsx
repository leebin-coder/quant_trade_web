import { useState, useEffect, useRef } from 'react'
import { Tabs, Empty } from 'antd'
import StockSelector from '../components/StockSelector'
import StockChart from '../components/StockChart'
import MarketOverview from '../components/MarketOverview'
import { stockDailyAPI } from '../services/api'
import './Quotes.css'

function Quotes() {
  const [mainModule, setMainModule] = useState('stock') // 主模块: overview, stock, sector, capital, sentiment
  const [activeKey, setActiveKey] = useState('trading')
  const [selectedStock, setSelectedStock] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('daily') // 时间周期: minute-分时, daily-日线, weekly-周线, monthly-月线, quarterly-季线, yearly-年线
  const allDataRef = useRef([])
  const loadingStartTimeRef = useRef(null)

  // 五大模块
  const mainModules = [
    { key: 'overview', label: '市场总览' },
    { key: 'stock', label: '个股' },
    { key: 'sector', label: '板块' },
    { key: 'capital', label: '资金' },
    { key: 'sentiment', label: '市场情绪' },
  ]

  // 个股模块的六个tab
  const tabItems = [
    { key: 'trading', label: '交易数据' },
    { key: 'technical', label: '派生技术指标' },
    { key: 'capital', label: '资金' },
    { key: 'fundamental', label: '基本面' },
    { key: 'sentiment', label: '市场环境与情绪' },
    { key: 'future', label: '未来何往' },
  ]

  // 聚合日线数据为不同周期
  const aggregateData = (dailyData, period) => {
    if (!dailyData || dailyData.length === 0) return []
    if (period === 'daily') return dailyData

    const result = []
    let currentGroup = []
    let currentPeriodKey = null

    const getPeriodKey = (dateStr) => {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const quarter = Math.floor(month / 3) + 1

      switch (period) {
        case 'weekly':
          // 获取该日期所在周的周一
          const day = date.getDay()
          const diff = date.getDate() - day + (day === 0 ? -6 : 1)
          const monday = new Date(date.setDate(diff))
          return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
        case 'monthly':
          return `${year}-${String(month).padStart(2, '0')}`
        case 'quarterly':
          return `${year}-Q${quarter}`
        case 'yearly':
          return `${year}`
        default:
          return dateStr
      }
    }

    dailyData.forEach((item, index) => {
      const periodKey = getPeriodKey(item.time)

      if (currentPeriodKey !== periodKey) {
        // 新周期，处理上一个周期的数据
        if (currentGroup.length > 0) {
          const aggregated = {
            time: currentGroup[0].time, // 使用该周期第一天的日期
            open: currentGroup[0].open,
            high: Math.max(...currentGroup.map(d => d.high)),
            low: Math.min(...currentGroup.map(d => d.low)),
            close: currentGroup[currentGroup.length - 1].close,
            volume: currentGroup.reduce((sum, d) => sum + d.volume, 0),
          }
          result.push(aggregated)
        }

        // 开始新周期
        currentPeriodKey = periodKey
        currentGroup = [item]
      } else {
        // 同一周期，添加到当前组
        currentGroup.push(item)
      }

      // 处理最后一组
      if (index === dailyData.length - 1 && currentGroup.length > 0) {
        const aggregated = {
          time: currentGroup[0].time,
          open: currentGroup[0].open,
          high: Math.max(...currentGroup.map(d => d.high)),
          low: Math.min(...currentGroup.map(d => d.low)),
          close: currentGroup[currentGroup.length - 1].close,
          volume: currentGroup.reduce((sum, d) => sum + d.volume, 0),
        }
        result.push(aggregated)
      }
    })

    return result
  }

  // 查询所有历史日线数据（5年5年查询直到所有数据加载完）
  const fetchAllStockDaily = async (stockCode) => {
    if (!stockCode) return

    setLoading(true)
    loadingStartTimeRef.current = Date.now()
    let allData = []

    try {
      const today = new Date()
      const endDate = today.toISOString().split('T')[0]

      // 从1990年开始查询（假设最早的股票数据）
      let currentEndDate = endDate
      let currentStartYear = today.getFullYear() - 5
      let hasMoreData = true

      while (hasMoreData && currentStartYear >= 1990) {
        const currentStartDate = `${currentStartYear}-01-01`

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

          // 准备下一次查询
          currentEndDate = new Date(newData[0].time)
          currentEndDate.setDate(currentEndDate.getDate() - 1)
          currentEndDate = currentEndDate.toISOString().split('T')[0]
          currentStartYear -= 5
        } else {
          // 没有更多数据了
          hasMoreData = false
        }
      }

      if (allData.length > 0) {
        allDataRef.current = allData

        // 计算已经过去的时间
        const elapsedTime = Date.now() - loadingStartTimeRef.current
        const remainingTime = Math.max(0, 1800 - elapsedTime)

        // 确保加载动画至少显示1.8秒
        setTimeout(() => {
          // 根据当前周期聚合数据
          const aggregated = aggregateData(allData, period)
          setChartData(aggregated)
          setLoading(false)
        }, remainingTime)
      } else {
        // 即使无数据，也要等待1.8秒
        const elapsedTime = Date.now() - loadingStartTimeRef.current
        const remainingTime = Math.max(0, 1800 - elapsedTime)

        setTimeout(() => {
          setChartData([])
          setLoading(false)
        }, remainingTime)
      }
    } catch (error) {
      console.error('查询日线数据失败:', error)
      setLoading(false)
    }
  }

  // 处理股票选择
  const handleStockSelect = (stock) => {
    setSelectedStock(stock)
    setActiveKey('trading') // 切换到交易数据Tab
  }

  // 处理时间周期变化
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)

    // 分时数据需要后端支持
    if (newPeriod === 'minute') {
      console.log('分时数据需要后端API支持')
      setChartData([])
      return
    }

    // 使用已加载的日线数据进行聚合
    if (allDataRef.current.length > 0) {
      const aggregated = aggregateData(allDataRef.current, newPeriod)
      setChartData(aggregated)
    }
  }

  // 当选中股票改变时，加载所有数据
  useEffect(() => {
    if (selectedStock) {
      allDataRef.current = []
      setChartData([])
      setPeriod('daily') // 重置为日线
      fetchAllStockDaily(selectedStock.stockCode)
    }
  }, [selectedStock])

  return (
    <div className="quotes-container">
      {/* 顶部五大模块切换 */}
      <div className="main-modules">
        {mainModules.map(module => (
          <div
            key={module.key}
            className={`module-tab ${mainModule === module.key ? 'active' : ''}`}
            onClick={() => setMainModule(module.key)}
          >
            {module.label}
          </div>
        ))}
      </div>

      {/* 模块内容区域 */}
      <div className="module-content">
        {mainModule === 'stock' ? (
          // 个股模块
          <div className="stock-module">
            {/* 左侧股票选择器 */}
            <StockSelector onStockSelect={handleStockSelect} />

            {/* 右侧：Tab Bar + 内容 */}
            <div className="quotes-tabs-wrapper">
              <Tabs
                activeKey={activeKey}
                onChange={setActiveKey}
                tabPosition="top"
                className="quotes-tabs"
                tabBarStyle={{ textAlign: 'right' }}
                items={tabItems.map(item => ({
                  key: item.key,
                  label: item.label,
                  children: (
                    <div className="tab-content">
                      {item.key === 'trading' ? (
                        // 交易数据Tab - 显示K线图
                        selectedStock ? (
                          loading ? (
                            // 加载中 - 显示四色渐变文字
                            <div className="tab-content-placeholder">
                              <div className="loading-text">{item.label}</div>
                            </div>
                          ) : chartData.length > 0 ? (
                            <StockChart
                              data={chartData}
                              height={600}
                              title={`${selectedStock.stockName} ${selectedStock.stockCode}`}
                              period={period}
                              onPeriodChange={handlePeriodChange}
                            />
                          ) : (
                            // 无数据 - 显示Empty组件
                            <div className="tab-content-placeholder">
                              <Empty
                                description="暂无数据"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                              />
                            </div>
                          )
                        ) : (
                          // 未选中股票 - 显示Tab文案
                          <div className="tab-content-placeholder">
                            {item.label}
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
          </div>
        ) : mainModule === 'overview' ? (
          // 市场总览模块
          <div className="overview-module">
            <MarketOverview />
          </div>
        ) : mainModule === 'sector' ? (
          // 板块模块
          <div className="sector-module">
            <div className="module-placeholder">板块</div>
          </div>
        ) : mainModule === 'capital' ? (
          // 资金模块
          <div className="capital-module">
            <div className="module-placeholder">资金</div>
          </div>
        ) : mainModule === 'sentiment' ? (
          // 市场情绪模块
          <div className="sentiment-module">
            <div className="module-placeholder">市场情绪</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Quotes
