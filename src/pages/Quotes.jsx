import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Tabs, Empty, message } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import StockSelector from '../components/StockSelector'
import StockChart from '../components/StockChart'
import MarketOverview from '../components/MarketOverview'
import { stockDailyAPI, stockCompanyAPI } from '../services/api'
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext'
import { useStockTicksStream } from '../hooks/useStockTicksStream'
import useTradingSession from '../hooks/useTradingSession'
import { formatLargeNumber } from '../utils/format'
import './Quotes.css'

const TICK_STATUS_TEXT = {
  trading: '交易中',
  rest: '休息时段',
  non_trading: '非交易时段',
}

const MAIN_MODULES = [
  { key: 'overview', label: '市场总览' },
  { key: 'stock', label: '个股' },
  { key: 'sector', label: '板块' },
  { key: 'capital', label: '资金' },
  { key: 'sentiment', label: '市场情绪' },
]

function Quotes() {
  const location = useLocation()
  const navigate = useNavigate()
  const { openKnowledge } = useKnowledgeBase()
  const [mainModule, setMainModule] = useState('stock') // 主模块: overview, stock, sector, capital, sentiment
  const [activeKey, setActiveKey] = useState('trading')
  const [selectedStock, setSelectedStock] = useState(null)
  const [companyDetail, setCompanyDetail] = useState(null) // 公司详情数据
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('daily') // 时间周期: minute-分时, daily-日线, weekly-周线, monthly-月线, quarterly-季线, yearly-年线
  const [adjustFlag, setAdjustFlag] = useState(2) // 复权类型: 1-后复权, 2-前复权, 3-不复权 (默认前复权)
  const [chartHeight, setChartHeight] = useState(520)
  const [chartHeaderHeight, setChartHeaderHeight] = useState(0)
  const [intradayTicks, setIntradayTicks] = useState([])
  const [tickStreamStatus, setTickStreamStatus] = useState('non_trading')
  const [tickConnectionState, setTickConnectionState] = useState('idle')
  const [tickStreamEnabled, setTickStreamEnabled] = useState(false)
  const allDataRef = useRef([])
  const loadingStartTimeRef = useRef(null)
  // 缓存三种复权类型的数据: { 1: [], 2: [], 3: [] }
  const dataCacheRef = useRef({})
  const currentStockCodeRef = useRef(null)
  const containerRef = useRef(null)
  const mainModulesRef = useRef(null)
  const tradingTabsRef = useRef(null)
  const tabContentRef = useRef(null)
  const chartSectionRef = useRef(null)
  const tradingSession = useTradingSession()
  const effectiveTradeDate = tradingSession.effectiveTradingDate
  const isTradingTabActive = mainModule === 'stock' && activeKey === 'trading'
  const shouldStreamTicks = tickStreamEnabled &&
    Boolean(selectedStock?.stockCode) &&
    Boolean(effectiveTradeDate)
  const tickStatusLabel = TICK_STATUS_TEXT[tickStreamStatus] || '未知状态'

  const syncQueryWithModule = useCallback((moduleKey) => {
    if (location.pathname !== '/quotes') return
    const params = new URLSearchParams(location.search)
    if (params.get('module') === moduleKey) return
    params.set('module', moduleKey)
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true })
  }, [location.pathname, location.search, navigate])

  const handleModuleChange = useCallback((moduleKey) => {
    setMainModule(moduleKey)
    syncQueryWithModule(moduleKey)
  }, [syncQueryWithModule])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const moduleKey = params.get('module')
    if (moduleKey && MAIN_MODULES.some(item => item.key === moduleKey) && moduleKey !== mainModule) {
      setMainModule(moduleKey)
    }
  }, [location.search, mainModule])

  const { ticks: streamTicks, status: streamStatus, connectionState: streamConnectionState, historyTicks: streamHistory } = useStockTicksStream({
    stockCode: selectedStock?.stockCode,
    enabled: shouldStreamTicks,
    tradeDate: effectiveTradeDate,
  })
  const latestStreamTick = useMemo(
    () => (streamTicks?.length ? streamTicks[streamTicks.length - 1] : null),
    [streamTicks]
  )
  const latestHistoryTick = useMemo(
    () => (streamHistory?.length ? streamHistory[streamHistory.length - 1] : null),
    [streamHistory]
  )
  const latestTick = useMemo(() => {
    if (latestStreamTick) return latestStreamTick
    if (intradayTicks.length) {
      return intradayTicks[intradayTicks.length - 1]
    }
    return latestHistoryTick
  }, [latestStreamTick, intradayTicks, latestHistoryTick])

  useEffect(() => {
    if (!shouldStreamTicks) {
      if (!tickStreamEnabled || !selectedStock?.stockCode) {
        setIntradayTicks([])
        setTickStreamStatus('non_trading')
        setTickConnectionState('idle')
      }
      return
    }
    const normalizedStatus = streamStatus === 'rest' ? 'non_trading' : streamStatus || 'non_trading'
    const mergedTicks = (Array.isArray(streamTicks) && streamTicks.length > 0)
      ? streamTicks
      : (Array.isArray(streamHistory) ? streamHistory : [])

    setIntradayTicks(mergedTicks)
    setTickStreamStatus(normalizedStatus)
    if (streamConnectionState) {
      setTickConnectionState(streamConnectionState)
    }
  }, [shouldStreamTicks, streamTicks, streamStatus, streamConnectionState, tickStreamEnabled, selectedStock?.stockCode, streamHistory])

  const handleChartHeaderHeight = useCallback((height) => {
    setChartHeaderHeight(prev => {
      const roundedPrev = Math.round(prev || 0)
      const roundedNext = Math.round(height || 0)
      return roundedPrev === roundedNext ? prev : height || 0
    })
  }, [])

  const updateChartHeight = useCallback(() => {
    if (typeof window === 'undefined') return
    const viewport = window.innerHeight || 900
    const containerOffset = containerRef.current ? Math.max(0, containerRef.current.getBoundingClientRect().top) : 0
    const modulesHeight = mainModulesRef.current?.offsetHeight || 0
    const tabsHeight = tradingTabsRef.current?.offsetHeight || 0
    const titleHeight = chartHeaderHeight || 0
    const displayAreaHeight = tabContentRef.current
      ? tabContentRef.current.clientHeight
      : viewport - containerOffset - modulesHeight - tabsHeight
    const MIN_CHART_HEIGHT = 260
    const sectionTop = chartSectionRef.current
      ? Math.max(0, chartSectionRef.current.getBoundingClientRect().top)
      : containerOffset + modulesHeight + tabsHeight + titleHeight
    const viewportAvailable = viewport - sectionTop
    const tabHeight = tabContentRef.current?.clientHeight ?? null
    const chartOffsetWithinTab = tabContentRef.current && chartSectionRef.current
      ? chartSectionRef.current.offsetTop
      : 0
    const tabAvailable = tabHeight !== null
      ? tabHeight - chartOffsetWithinTab
      : null
    const maxChartHeight = tabAvailable !== null
      ? Math.max(MIN_CHART_HEIGHT, tabAvailable)
      : viewportAvailable
    const constrainedHeight = Math.max(MIN_CHART_HEIGHT, Math.min(maxChartHeight, viewportAvailable))
    setChartHeight(constrainedHeight)
  }, [chartHeaderHeight])

  useEffect(() => {
    updateChartHeight()
    if (typeof window === 'undefined') return
    window.addEventListener('resize', updateChartHeight)
    return () => window.removeEventListener('resize', updateChartHeight)
  }, [updateChartHeight])

  useEffect(() => {
    updateChartHeight()
  }, [activeKey, mainModule, selectedStock, period, adjustFlag, updateChartHeight])

  useEffect(() => {
    if (!chartData.length) {
      handleChartHeaderHeight(0)
    }
  }, [chartData.length, handleChartHeaderHeight])

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
  const normalizeDateInput = (value) => {
    if (!value) return ''
    const str = String(value).trim()
    if (!str) return ''
    if (str.includes('-')) return str.split('T')[0]
    if (str.length === 8) {
      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
    }
    return str
  }

  const resolveListingDate = (stock) => {
    if (!stock) return ''
    return normalizeDateInput(
      stock.listingDate ||
      stock.listDate ||
      stock.list_date ||
      stock.listing_date
    )
  }

  const fetchStockDailyByAdjustFlag = async (stockCode, targetAdjustFlag, listingDate) => {
    if (!stockCode) return []

    try {
      const today = new Date()
      const endDate = today.toISOString().split('T')[0]
      const normalizedListingDate = normalizeDateInput(listingDate) || '1990-01-01'

      const response = await stockDailyAPI.queryStockDaily({
        stockCode,
        startDate: normalizedListingDate,
        endDate,
        sortOrder: 'asc',
        adjustFlag: targetAdjustFlag,
      })

      if (response.code === 200 && Array.isArray(response.data)) {
        return response.data.map(item => {
          const dateOnly = item.tradeDate.split(' ')[0]
          return {
            time: dateOnly,
            open: parseFloat(item.openPrice),
            high: parseFloat(item.highPrice),
            low: parseFloat(item.lowPrice),
            close: parseFloat(item.closePrice),
            volume: parseFloat(item.volume),
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
      }

      return []
    } catch (error) {
      return []
    }
  }

  // 预加载所有三种复权类型的数据
  const fetchAllAdjustTypes = async (stockCode, listingDate) => {
    if (!stockCode) return

    setLoading(true)
    loadingStartTimeRef.current = Date.now()

    // 清空缓存
    dataCacheRef.current = {}
    currentStockCodeRef.current = stockCode

    try {
      // 并行加载三种复权类型的数据
      const [data1, data2, data3] = await Promise.all([
        fetchStockDailyByAdjustFlag(stockCode, 1, listingDate), // 后复权
        fetchStockDailyByAdjustFlag(stockCode, 2, listingDate), // 前复权
        fetchStockDailyByAdjustFlag(stockCode, 3, listingDate), // 不复权
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

      // 无论有没有数据都更新图表（没数据时显示空图表）
      setChartData(aggregated)
      // 注意：不在这里设置 setLoading(false)，等待图表渲染完成的回调
    } catch (error) {
      message.error('查询日线数据失败，请稍后重试')
      // 加载失败时也要显示空图表
      allDataRef.current = []
      setChartData([])
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
    // 确保加载动画至少显示2.5秒
    const elapsedTime = Date.now() - loadingStartTimeRef.current
    const remainingTime = Math.max(0, 2500 - elapsedTime)

    setTimeout(() => {
      setLoading(false)
    }, remainingTime)
  }

  // 处理时间周期变化
  const handlePeriodChange = (newPeriod) => {
    if (period === newPeriod) return
    setPeriod(newPeriod)

    if (newPeriod === 'minute') {
      setLoading(false)
      if (!selectedStock?.stockCode) {
        message.warning('请选择股票后再查看分时数据')
      }
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
        fetchAllAdjustTypes(selectedStock.stockCode, resolveListingDate(selectedStock))
      }
    }
  }

  // 获取公司详情
  const fetchCompanyDetail = async (stockCode) => {
    try {
      const response = await stockCompanyAPI.getCompanyDetail(stockCode)
      if (response.code === 200) {
        setCompanyDetail(response.data)
      } else {
        message.error('获取公司详情失败，请稍后重试')
        setCompanyDetail(null)
      }
    } catch (error) {
      message.error('获取公司详情失败，请稍后重试')
      setCompanyDetail(null)
    }
  }

  // 当选中股票改变时，加载所有数据
  useEffect(() => {
    if (selectedStock) {
      // 检查是否是新股票
      const isNewStock = currentStockCodeRef.current !== selectedStock.stockCode

      if (isNewStock) {
        // 新股票：清空数据、清空缓存、显示加载动画
        currentStockCodeRef.current = selectedStock.stockCode
        setLoading(true)
        allDataRef.current = []
        setChartData([])
        dataCacheRef.current = {} // 清空缓存
        setPeriod((prev) => (prev === 'minute' ? 'minute' : 'daily')) // 保留分时展示
        setAdjustFlag(2) // 重置为前复权
        setTickStreamEnabled(false)
        setIntradayTicks([])
        setTickStreamStatus('non_trading')
        setTickConnectionState('idle')

        // 稍微延迟一下再加载数据，确保加载动画能显示
        setTimeout(() => {
          fetchAllAdjustTypes(selectedStock.stockCode, resolveListingDate(selectedStock)) // 预加载所有复权类型的数据
          fetchCompanyDetail(selectedStock.stockCode) // 获取公司详情
        }, 50)
      }
    } else {
      // 没有选中股票时，清空所有数据
      currentStockCodeRef.current = null
      allDataRef.current = []
      setChartData([])
      dataCacheRef.current = {}
      setTickStreamEnabled(false)
      setIntradayTicks([])
      setTickStreamStatus('non_trading')
      setTickConnectionState('idle')
    }
  }, [selectedStock])

  useEffect(() => {
    if (period === 'minute' && selectedStock?.stockCode && effectiveTradeDate) {
      setTickStreamEnabled(true)
    }
  }, [period, selectedStock?.stockCode, effectiveTradeDate])

  const intradayBoardItems = useMemo(() => ([
    {
      key: 'depth',
      label: '五档',
      children: <FiveLevelBoard tick={latestTick} />,
    },
    {
      key: 'deals',
      label: '成交',
      children: <BoardPlaceholder message="成交明细模块建设中" />,
    },
  ]), [latestTick])

  const intradayBoard = useMemo(() => (
    <Tabs
      className="intraday-board-tabs"
      defaultActiveKey="depth"
      items={intradayBoardItems}
    />
  ), [intradayBoardItems])

  return (
    <div className="quotes-container" ref={containerRef}>
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
              <div className="tabs-bar-container" ref={tradingTabsRef}>
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
              <div className="tab-content-container" ref={tabContentRef}>
                {tabItems.map(item => (
                  <div
                    key={item.key}
                    className={`tab-pane ${activeKey === item.key ? 'active' : 'hidden'}`}
                  >
                    <div className="tab-content">
                      {item.key === 'trading' ? (
                        // 交易数据Tab - 显示K线图
                        selectedStock ? (
                              <div
                                ref={chartSectionRef}
                                className="trading-chart-wrapper"
                                style={{ height: chartHeight }}
                              >
                                {/* 加载遮罩层 - 覆盖整个区域 */}
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgb(28, 28, 28)',
                                  display: loading && period !== 'minute' ? 'flex' : 'none',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 100,
                                }}>
                                  <div className="loading-text">{item.label}</div>
                                </div>
                                {/* 图表容器 - 后台渲染，完成后显示 */}
                                <div
                                  className="trading-chart-content"
                                  style={{
                                    height: chartHeight,
                                    visibility: loading && period !== 'minute' ? 'hidden' : 'visible',
                                    opacity: loading && period !== 'minute' ? 0 : 1,
                                    transition: 'opacity 0.4s ease-in',
                                  }}
                                >
                                  {(period === 'minute' || chartData.length > 0) && (
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
                                      height={chartHeight}
                                      onHeaderHeightChange={handleChartHeaderHeight}
                                      intradayTicks={intradayTicks}
                                      intradayStatus={tickStreamStatus}
                                      intradayStatusLabel={tickStatusLabel}
                                      intradayBoard={intradayBoard}
                                      intradayConnectionState={tickConnectionState}
                                    />
                                  )}
                                </div>
                              </div>
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
          <div className="overview-module">
            <MarketOverview />
          </div>
        ) : mainModule === 'sector' ? (
          <div className="sector-module">
            <div className="module-placeholder">板块</div>
          </div>
        ) : mainModule === 'capital' ? (
          <div className="capital-module">
            <div className="module-placeholder">资金</div>
          </div>
        ) : mainModule === 'sentiment' ? (
          <div className="sentiment-module">
            <div className="module-placeholder">市场情绪</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Quotes

const SELL_LEVELS = [5, 4, 3, 2, 1]
const BUY_LEVELS = [1, 2, 3, 4, 5]

const formatPriceValue = (value) => {
  if (value === null || value === undefined) return '--'
  const num = Number(value)
  return Number.isNaN(num) ? '--' : num.toFixed(2)
}

const formatDepthVolume = (value) => {
  if (value === null || value === undefined) return '--'
  const num = Number(value)
  if (!Number.isFinite(num)) return '--'
  if (Math.abs(num) >= 10000) {
    return `${(num / 10000).toFixed(2)}万股`
  }
  return `${Math.round(num)}股`
}

const resolvePreCloseValue = (tick) => {
  const candidates = [
    tick?.preClose,
    tick?.preclose,
    tick?.pre_close,
    tick?.preClosePrice,
    tick?.prevClose,
    tick?.previousClose,
    tick?.pre_close_price,
  ]
  for (const value of candidates) {
    if (value === 0 || value) {
      const num = Number(value)
      if (!Number.isNaN(num)) {
        return num
      }
    }
  }
  return null
}

const resolveVolumeNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : 0
}

function BoardPlaceholder({ message }) {
  return (
    <div className="board-placeholder">
      {message}
    </div>
  )
}

function FiveLevelBoard({ tick }) {
  if (!tick) {
    return <Empty description="暂无五档数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  const previousClose = resolvePreCloseValue(tick)
  const sellRows = SELL_LEVELS.map((level) => ({
    level,
    price: tick[`a${level}_p`],
    volume: resolveVolumeNumber(tick[`a${level}_v`]),
    side: 'sell',
  }))
  const buyRows = BUY_LEVELS.map((level) => ({
    level,
    price: tick[`b${level}_p`],
    volume: resolveVolumeNumber(tick[`b${level}_v`]),
    side: 'buy',
  }))
  const combinedVolumes = [...sellRows, ...buyRows].map((row) => row.volume)
  const maxVolume = combinedVolumes.length ? Math.max(...combinedVolumes, 0) : 0
  const safeMaxVolume = maxVolume > 0 ? maxVolume : 1

  const renderRow = (row) => {
    const widthPercent = row.volume > 0 ? (row.volume / safeMaxVolume) * 100 : 0
    let priceColor = row.side === 'sell' ? '#52c41a' : '#f5222d'
    if (previousClose !== null && previousClose !== undefined && row.price !== null && row.price !== undefined) {
      const numericPrice = Number(row.price)
      if (!Number.isNaN(numericPrice)) {
        if (numericPrice > previousClose) {
          priceColor = '#ef232a'
        } else if (numericPrice < previousClose) {
          priceColor = '#14b143'
        } else {
          priceColor = '#8c8c8c'
        }
      }
    } else {
      priceColor = '#8c8c8c'
    }

    return (
      <div className={`orderbook-row ${row.side}`} key={`${row.side}-${row.level}`}>
        <div
          className={`orderbook-row-bar ${row.side}`}
          style={{ width: `${Math.min(100, Math.max(6, widthPercent))}%` }}
        />
        <span className="level-label">{`${row.side === 'sell' ? '卖' : '买'}${row.level}`}</span>
        <span className="price" style={{ color: priceColor }}>{formatPriceValue(row.price)}</span>
        <span className="volume">{formatDepthVolume(row.volume)}</span>
      </div>
    )
  }

  const totalSellVolume = sellRows.reduce((sum, row) => sum + row.volume, 0)
  const totalBuyVolume = buyRows.reduce((sum, row) => sum + row.volume, 0)
  const totalVolume = totalSellVolume + totalBuyVolume
  const buyRatio = totalVolume > 0 ? (totalBuyVolume / totalVolume) : 0.5
  const sellRatio = 1 - buyRatio

  return (
    <div className="five-level-board">
      <div className="orderbook-side">
        <div className="side-title">卖盘</div>
        <div className="orderbook-rows">
          {sellRows.map(renderRow)}
        </div>
      </div>
      <div className="orderbook-ratio">
        <div className="ratio-labels">
          <span>卖 {formatDepthVolume(totalSellVolume)}</span>
          <span>买 {formatDepthVolume(totalBuyVolume)}</span>
        </div>
        <div className="ratio-bar">
          <div className="ratio-segment sell" style={{ flexBasis: `${sellRatio * 100}%` }} />
          <div className="ratio-segment buy" style={{ flexBasis: `${buyRatio * 100}%` }} />
        </div>
        <div className="ratio-values">
          <span style={{ color: '#14b143' }}>{(sellRatio * 100).toFixed(1)}%</span>
          <span style={{ color: '#ef232a' }}>{(buyRatio * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div className="orderbook-side">
        <div className="side-title">买盘</div>
        <div className="orderbook-rows">
          {buyRows.map(renderRow)}
        </div>
      </div>
    </div>
  )
}
