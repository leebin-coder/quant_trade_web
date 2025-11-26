import { useState, useEffect, useRef } from 'react'
import { Tabs, Empty } from 'antd'
import StockSelector from '../components/StockSelector'
import StockChart from '../components/StockChart'
import MarketOverview from '../components/MarketOverview'
import { stockDailyAPI, stockCompanyAPI } from '../services/api'
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext'
import './Quotes.css'

function Quotes() {
  const { openKnowledge } = useKnowledgeBase()
  const [mainModule, setMainModule] = useState('stock') // 主模块: overview, stock, sector, capital, sentiment
  const [activeKey, setActiveKey] = useState('trading')
  const [selectedStock, setSelectedStock] = useState(null)
  const [companyDetail, setCompanyDetail] = useState(null) // 公司详情数据
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('daily') // 时间周期: minute-分时, daily-日线, weekly-周线, monthly-月线, quarterly-季线, yearly-年线
  const [adjustFlag, setAdjustFlag] = useState(3) // 复权类型: 1-后复权, 2-前复权, 3-不复权
  const allDataRef = useRef([])
  const loadingStartTimeRef = useRef(null)
  // 缓存三种复权类型的数据: { 1: [], 2: [], 3: [] }
  const dataCacheRef = useRef({})
  const currentStockCodeRef = useRef(null)

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
          const lastItem = currentGroup[currentGroup.length - 1]
          const aggregated = {
            time: currentGroup[0].time, // 使用该周期第一天的日期
            open: currentGroup[0].open,
            high: Math.max(...currentGroup.map(d => d.high)),
            low: Math.min(...currentGroup.map(d => d.low)),
            close: lastItem.close,
            volume: currentGroup.reduce((sum, d) => sum + d.volume, 0),
            // 使用周期最后一天的数据
            preClose: lastItem.preClose,
            changeAmount: lastItem.changeAmount,
            pctChange: lastItem.pctChange,
            turn: currentGroup.reduce((sum, d) => sum + (d.turn || 0), 0), // 换手率累加
            tradeStatus: lastItem.tradeStatus,
            peTtm: lastItem.peTtm,
            pbMrq: lastItem.pbMrq,
            psTtm: lastItem.psTtm,
            pcfNcfTtm: lastItem.pcfNcfTtm,
            isSt: lastItem.isSt,
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
        const lastItem = currentGroup[currentGroup.length - 1]
        const aggregated = {
          time: currentGroup[0].time,
          open: currentGroup[0].open,
          high: Math.max(...currentGroup.map(d => d.high)),
          low: Math.min(...currentGroup.map(d => d.low)),
          close: lastItem.close,
          volume: currentGroup.reduce((sum, d) => sum + d.volume, 0),
          // 使用周期最后一天的数据
          preClose: lastItem.preClose,
          changeAmount: lastItem.changeAmount,
          pctChange: lastItem.pctChange,
          turn: currentGroup.reduce((sum, d) => sum + (d.turn || 0), 0), // 换手率累加
          tradeStatus: lastItem.tradeStatus,
          peTtm: lastItem.peTtm,
          pbMrq: lastItem.pbMrq,
          psTtm: lastItem.psTtm,
          pcfNcfTtm: lastItem.pcfNcfTtm,
          isSt: lastItem.isSt,
        }
        result.push(aggregated)
      }
    })

    return result
  }

  // 查询指定复权类型的所有历史日线数据（5年5年查询直到所有数据加载完）
  const fetchStockDailyByAdjustFlag = async (stockCode, targetAdjustFlag) => {
    if (!stockCode) return []

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
          adjustFlag: targetAdjustFlag, // 复权类型
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
              // 新增字段
              preClose: item.preClose ? parseFloat(item.preClose) : null,
              changeAmount: item.changeAmount ? parseFloat(item.changeAmount) : null,
              pctChange: item.pctChange ? parseFloat(item.pctChange) : null,
              turn: item.turn ? parseFloat(item.turn) : null,
              tradeStatus: item.tradeStatus,
              peTtm: item.peTtm ? parseFloat(item.peTtm) : null,
              pbMrq: item.pbMrq ? parseFloat(item.pbMrq) : null,
              psTtm: item.psTtm ? parseFloat(item.psTtm) : null,
              pcfNcfTtm: item.pcfNcfTtm ? parseFloat(item.pcfNcfTtm) : null,
              isSt: item.isSt,
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

      return allData
    } catch (error) {
      console.error(`查询复权类型${targetAdjustFlag}的日线数据失败:`, error)
      return []
    }
  }

  // 预加载所有三种复权类型的数据
  const fetchAllAdjustTypes = async (stockCode) => {
    if (!stockCode) return

    setLoading(true)
    loadingStartTimeRef.current = Date.now()

    // 清空缓存
    dataCacheRef.current = {}
    currentStockCodeRef.current = stockCode

    try {
      // 并行加载三种复权类型的数据
      const [data1, data2, data3] = await Promise.all([
        fetchStockDailyByAdjustFlag(stockCode, 1), // 后复权
        fetchStockDailyByAdjustFlag(stockCode, 2), // 前复权
        fetchStockDailyByAdjustFlag(stockCode, 3), // 不复权
      ])

      // 缓存所有数据
      dataCacheRef.current = {
        1: data1,
        2: data2,
        3: data3,
      }

      // 使用当前选中的复权类型数据
      const currentData = dataCacheRef.current[adjustFlag] || []
      allDataRef.current = currentData

      // 根据当前周期聚合数据并显示
      const aggregated = aggregateData(currentData, period)
      setChartData(aggregated)
      // 注意：不在这里设置 setLoading(false)，等待图表渲染完成的回调
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

  // 处理图表渲染完成
  const handleChartReady = () => {
    // 图表渲染完成，停止加载动画
    setLoading(false)
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

  // 处理复权类型变化
  const handleAdjustFlagChange = (newAdjustFlag) => {
    setAdjustFlag(newAdjustFlag)

    // 如果有缓存数据，直接使用，不重新请求
    if (dataCacheRef.current[newAdjustFlag] && dataCacheRef.current[newAdjustFlag].length > 0) {
      const cachedData = dataCacheRef.current[newAdjustFlag]
      allDataRef.current = cachedData
      const aggregated = aggregateData(cachedData, period)
      setChartData(aggregated)
    } else {
      // 如果缓存中没有数据，重新加载
      if (selectedStock) {
        fetchAllAdjustTypes(selectedStock.stockCode)
      }
    }
  }

  // 获取公司详情
  const fetchCompanyDetail = async (stockCode) => {
    try {
      const response = await stockCompanyAPI.getCompanyDetail(stockCode)
      console.log('公司详情响应:', response)
      if (response.code === 200) {
        setCompanyDetail(response.data)
        console.log('公司详情数据:', response.data)
      } else {
        console.error('获取公司详情失败:', response.message)
        setCompanyDetail(null)
      }
    } catch (error) {
      console.error('获取公司详情失败:', error)
      setCompanyDetail(null)
    }
  }

  // 当选中股票改变时，加载所有数据
  useEffect(() => {
    if (selectedStock) {
      allDataRef.current = []
      setChartData([])
      setPeriod('daily') // 重置为日线
      fetchAllAdjustTypes(selectedStock.stockCode) // 预加载所有复权类型的数据
      fetchCompanyDetail(selectedStock.stockCode) // 获取公司详情
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
              {/* Tab Bar 容器 */}
              <div className="tabs-bar-container">
                {/* 交易数据Tabs */}
                <div className="data-tabs-wrapper">
                  <div className="data-tabs-nav">
                    {tabItems.map(item => (
                      <div
                        key={item.key}
                        className={`data-tab ${activeKey === item.key ? 'active' : ''}`}
                        onClick={() => setActiveKey(item.key)}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tab 内容区域 */}
              <div className="tab-content-container">
                {tabItems.map(item => (
                  <div
                    key={item.key}
                    className={`tab-pane ${activeKey === item.key ? 'active' : 'hidden'}`}
                  >
                    <div className="tab-content">
                      {item.key === 'trading' ? (
                        // 交易数据Tab - 显示K线图和看板
                        selectedStock ? (
                          loading ? (
                            // 加载中 - 显示四色渐变文字
                            <div className="tab-content-placeholder">
                              <div className="loading-text">{item.label}</div>
                            </div>
                          ) : chartData.length > 0 ? (
                            <div className="trading-content-layout">
                              {/* 上方图表区域 - 动态高度 */}
                              <div className="chart-area">
                                <StockChart
                                  data={chartData}
                                  title={`${selectedStock.stockName} ${selectedStock.stockCode}`}
                                  stockInfo={selectedStock}
                                  companyDetail={companyDetail}
                                  period={period}
                                  onPeriodChange={handlePeriodChange}
                                  adjustFlag={adjustFlag}
                                  onAdjustFlagChange={handleAdjustFlagChange}
                                  onChartReady={handleChartReady}
                                  onOpenKnowledge={openKnowledge}
                                />
                              </div>
                              {/* 下方看板区域 - 固定300px */}
                              <div className="dashboard-area">
                                <div className="dashboard-content">
                                  {/* 看板内容 */}
                                  <div style={{
                                    color: '#ffffff',
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    paddingTop: '130px'
                                  }}>
                                    数据看板区域
                                  </div>
                                </div>
                              </div>
                            </div>
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
                  </div>
                ))}
              </div>
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
