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
  const [period, setPeriod] = useState('minute') // 默认展示分时图
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
  const moduleContentRef = useRef(null)
  const stockModuleRef = useRef(null)
  const quotesTabsWrapperRef = useRef(null)
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
  }, [chartHeaderHeight])

  const updateChartHeight = useCallback(() => {
    if (!isTradingTabActive) {
      return
    }
    const tabContainer = tabContentRef.current
    const chartWrapper = chartSectionRef.current
    if (!tabContainer || !chartWrapper) return

    const offsetInsideTab = chartWrapper.offsetTop
    const MIN_CHART_HEIGHT = 260
    const availableHeight = Math.max(0, tabContainer.clientHeight - offsetInsideTab)

    setChartHeight((prev) => {
      const next = Math.max(MIN_CHART_HEIGHT, availableHeight)
      return prev === next ? prev : next
    })
  }, [isTradingTabActive])

  useEffect(() => {
    updateChartHeight()
    if (typeof window === 'undefined') return undefined
    const handleResize = () => {
      updateChartHeight()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
      children: <FiveLevelBoard tick={latestTick} ticks={intradayTicks} />,
    },
    {
      key: 'deals',
      label: '成交',
      children: <BoardPlaceholder message="成交明细模块建设中" />,
    },
  ]), [intradayTicks, latestTick])

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
      <div className="module-content" ref={moduleContentRef}>
        {mainModule === 'stock' ? (
          // 个股模块
          <div className="stock-module" ref={stockModuleRef}>
            {/* 左侧股票选择器 */}
            <StockSelector onStockSelect={handleStockSelect} />

            {/* 右侧：Tab Bar + 内容 */}
            <div className="quotes-tabs-wrapper" ref={quotesTabsWrapperRef}>
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
const SELL_LEVEL_INDEX = Math.max(0, SELL_LEVELS.findIndex((level) => level === 1))
const BUY_LEVEL_INDEX = 0

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
    return `${(num / 10000).toFixed(2)}万`
  }
  return `${Math.round(num)}`
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

const resolvePriceValue = (tick) => {
  if (!tick) return null
  const candidates = [
    tick.price,
    tick.trade,
    tick.close,
    tick.last,
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

function BoardPlaceholder({ message }) {
  return (
    <div className="board-placeholder">
      {message}
    </div>
  )
}

function FiveLevelBoard({ tick, ticks = [] }) {
  const [activeView, setActiveView] = useState('book')
  const history = useMemo(() => buildDepthHistory(ticks), [ticks])
  const hasHistory = history.entries.length > 0

  useEffect(() => {
    if (!hasHistory && activeView !== 'book') {
      setActiveView('book')
    }
  }, [hasHistory, activeView])

  const renderOrderBook = () => {
    if (!tick) {
      return (
        <div className="five-level-empty">
          <Empty description="暂无五档数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )
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
    const totalSellVolume = sellRows.reduce((sum, row) => sum + row.volume, 0)
    const totalBuyVolume = buyRows.reduce((sum, row) => sum + row.volume, 0)
    const totalVolume = totalSellVolume + totalBuyVolume
    const buyRatio = totalVolume > 0 ? (totalBuyVolume / totalVolume) : 0.5
    const sellRatio = 1 - buyRatio

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

    return (
      <>
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
      </>
    )
  }

  if (!tick && !hasHistory) {
    return (
      <>
        <div className="five-level-nav">
          <button type="button" className="active" disabled>
            盘口
          </button>
        </div>
        <div className="five-level-empty">
          <Empty description="暂无五档数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      </>
    )
  }

  const viewOptions = [
    { key: 'book', label: '盘口', disabled: !tick },
    { key: 'price', label: '价格', disabled: !hasHistory },
    { key: 'volume', label: '委托量', disabled: !hasHistory },
  ]

  return (
    <>
      <div className="five-level-nav">
        {viewOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={option.disabled}
            className={activeView === option.key ? 'active' : ''}
            onClick={() => setActiveView(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {activeView === 'book'
        ? renderOrderBook()
        : (
          <FiveLevelHistoryChart
            history={history}
            chartType={activeView === 'price' ? 'price' : 'volume'}
          />
        )}
    </>
  )
}

const HISTORY_LIMIT = 600
const SELL_PRICE_LINE_COLOR = '#ef232a'
const BUY_PRICE_LINE_COLOR = '#14b143'
const SELL_PRICE_FILL_COLOR = 'rgba(239, 35, 42, 0.12)'
const BUY_PRICE_FILL_COLOR = null
const SELL_VOLUME_LINE_COLOR = '#f8d27a'
const BUY_VOLUME_LINE_COLOR = '#7bc8ff'
const SELL_VOLUME_FILL_COLOR = null
const BUY_VOLUME_FILL_COLOR = null

const normalizeBoardDate = (value) => {
  if (!value) return ''
  if (value instanceof Date) {
    const yyyy = value.getFullYear()
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const dd = String(value.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  const str = String(value).trim()
  if (!str) return ''
  if (str.includes('-')) return str
  if (str.length === 8) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
  }
  return str
}

const normalizeBoardTime = (value) => {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  if (!str) return ''
  if (str.includes(':')) {
    const [hh = '00', mm = '00', ss = '00'] = str.split(':')
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }
  const padded = str.padStart(6, '0')
  if (padded.length < 6) return ''
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`
}

const parseDepthTimestamp = (tick) => {
  if (!tick) return null
  if (Number.isFinite(tick.__timestamp)) {
    return Number(tick.__timestamp)
  }
  const datePart = normalizeBoardDate(tick.date || tick.trade_date || tick.trading_date || '')
  const timePart = normalizeBoardTime(tick.time || tick.trade_time || '')
  if (!datePart || !timePart) return null
  const composed = `${datePart}T${timePart}+08:00`
  const parsed = Date.parse(composed)
  return Number.isNaN(parsed) ? null : parsed
}

const AUCTION_START_SECONDS = (9 * 3600) + (15 * 60)
const AUCTION_END_SECONDS = (9 * 3600) + (25 * 60)

const formatDepthTimeLabel = (timestamp) => {
  if (!Number.isFinite(timestamp)) return '--:--'
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const isAuctionTimestamp = (timestamp) => {
  if (!Number.isFinite(timestamp)) return false
  const date = new Date(timestamp)
  const seconds = (date.getHours() * 3600) + (date.getMinutes() * 60) + date.getSeconds()
  return seconds >= AUCTION_START_SECONDS && seconds <= AUCTION_END_SECONDS
}

const toNumeric = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const toPositiveNumeric = (value) => {
  const num = Number(value)
  return Number.isFinite(num) && num >= 0 ? num : null
}

const buildDepthHistory = (ticks) => {
  if (!Array.isArray(ticks) || !ticks.length) {
    return { entries: [], startLabel: '--:--', endLabel: '--:--', referencePrevClose: null, referenceLastPrice: null }
  }
  const recent = ticks.length > HISTORY_LIMIT ? ticks.slice(-HISTORY_LIMIT) : ticks
  let referencePrevClose = null
  let referenceLastPrice = null
  const entries = recent
    .map((item, index) => {
      const timestamp = parseDepthTimestamp(item)
      const fallbackLabel = `#${index + 1}`
      const sells = SELL_LEVELS.map((level) => toNumeric(item[`a${level}_p`]))
      const buys = BUY_LEVELS.map((level) => toNumeric(item[`b${level}_p`]))
      const sellVolumes = SELL_LEVELS.map((level) => toPositiveNumeric(item[`a${level}_v`]))
      const buyVolumes = BUY_LEVELS.map((level) => toPositiveNumeric(item[`b${level}_v`]))
      const hasValues = [...sells, ...buys, ...sellVolumes, ...buyVolumes].some((value) => value !== null)
      if (!hasValues) return null
      if (referencePrevClose === null) {
        const prevCandidate = resolvePreCloseValue(item)
        if (prevCandidate !== null) {
          referencePrevClose = prevCandidate
        }
      }
      const latestPrice = resolvePriceValue(item)
      if (latestPrice !== null) {
        referenceLastPrice = latestPrice
      }
      return {
        timestamp,
        label: timestamp ? formatDepthTimeLabel(timestamp) : fallbackLabel,
        sells,
        buys,
        sellVolumes,
        buyVolumes,
        isAuction: isAuctionTimestamp(timestamp),
      }
    })
    .filter(Boolean)

  if (!entries.length) {
    return { entries: [], startLabel: '--:--', endLabel: '--:--', referencePrevClose: null, referenceLastPrice: null }
  }
  return {
    entries,
    startLabel: entries[0].label,
    endLabel: entries[entries.length - 1].label,
    referencePrevClose,
    referenceLastPrice,
  }
}

function FiveLevelHistoryChart({ history, chartType = 'price' }) {
  const filteredEntries = useMemo(() => {
    if (chartType !== 'price') return history.entries
    const nonAuction = history.entries.filter((entry) => !entry?.isAuction)
    return nonAuction.length ? nonAuction : history.entries
  }, [history.entries, chartType])

  if (!filteredEntries.length) {
    return (
      <div className="five-level-empty">
        <Empty description="暂无可用曲线" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  if (chartType === 'volume') {
    return (
      <VolumeHeatmapPanel
        entries={filteredEntries}
        referenceLastPrice={history.referenceLastPrice}
      />
    )
  }

  return (
    <DepthChartPanel
      entries={filteredEntries}
      startLabel={filteredEntries[0]?.label || '--'}
      endLabel={filteredEntries[filteredEntries.length - 1]?.label || '--'}
      type={chartType}
      referencePrevClose={history.referencePrevClose}
      referenceLastPrice={history.referenceLastPrice}
    />
  )
}

const HEATMAP_ROWS = [
  { key: 'sell-5', label: '卖五', level: 5, side: 'sell', order: 0 },
  { key: 'sell-4', label: '卖四', level: 4, side: 'sell', order: 1 },
  { key: 'sell-3', label: '卖三', level: 3, side: 'sell', order: 2 },
  { key: 'sell-2', label: '卖二', level: 2, side: 'sell', order: 3 },
  { key: 'sell-1', label: '卖一', level: 1, side: 'sell', order: 4 },
  { key: 'buy-1', label: '买一', level: 1, side: 'buy', order: 5 },
  { key: 'buy-2', label: '买二', level: 2, side: 'buy', order: 6 },
  { key: 'buy-3', label: '买三', level: 3, side: 'buy', order: 7 },
  { key: 'buy-4', label: '买四', level: 4, side: 'buy', order: 8 },
  { key: 'buy-5', label: '买五', level: 5, side: 'buy', order: 9 },
]

const SELL_HEATMAP_RGB = [239, 35, 42]
const BUY_HEATMAP_RGB = [20, 177, 67]
const HEATMAP_REFERENCE_HEIGHT = 520
const PRICE_UP_COLOR = '#ef232a'
const PRICE_DOWN_COLOR = '#14b143'
const PRICE_FLAT_COLOR = '#8c8c8c'
const PRICE_MATCH_HIGHLIGHT = '#ffd666'

const clampRatio = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const resolveRowVolume = (entry, row) => {
  if (!entry) return null
  if (row.side === 'sell') {
    const index = SELL_LEVELS.findIndex((level) => level === row.level)
    return index >= 0 ? entry.sellVolumes?.[index] ?? null : null
  }
  const index = BUY_LEVELS.findIndex((level) => level === row.level)
  return index >= 0 ? entry.buyVolumes?.[index] ?? null : null
}

const resolveRowPrice = (entry, row) => {
  if (!entry) return null
  if (row.side === 'sell') {
    const index = SELL_LEVELS.findIndex((level) => level === row.level)
    return index >= 0 ? entry.sells?.[index] ?? null : null
  }
  const index = BUY_LEVELS.findIndex((level) => level === row.level)
  return index >= 0 ? entry.buys?.[index] ?? null : null
}

const getHeatmapColor = (side, ratio) => {
  const [r, g, b] = side === 'sell' ? SELL_HEATMAP_RGB : BUY_HEATMAP_RGB
  const alpha = 0.12 + clampRatio(ratio) * 0.88
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
}

const getPriceComparisonColor = (price, previousClose) => {
  const numericPrice = Number(price)
  const reference = Number(previousClose)
  if (!Number.isFinite(numericPrice) || !Number.isFinite(reference)) {
    return PRICE_FLAT_COLOR
  }
  if (numericPrice > reference) return PRICE_UP_COLOR
  if (numericPrice < reference) return PRICE_DOWN_COLOR
  return PRICE_FLAT_COLOR
}

function VolumeHeatmapPanel({ entries, referenceLastPrice }) {
  const latestEntry = entries[entries.length - 1] || null
  const previousClose = useMemo(() => {
    if (!latestEntry) return null
    return resolvePreCloseValue(latestEntry)
  }, [latestEntry])
  const rowMetadata = useMemo(() => {
    if (!latestEntry) return []
    return HEATMAP_ROWS.map((row) => {
      const priceValue = resolveRowPrice(latestEntry, row)
      const volumeValue = resolveRowVolume(latestEntry, row)
      return {
        ...row,
        price: priceValue,
        volume: volumeValue,
      }
    })
  }, [latestEntry])

  const sortedRows = useMemo(() => {
    if (!rowMetadata.length) return []
    const baseOrder = new Map(rowMetadata.map((row) => [row.key, row.order ?? 0]))
    return rowMetadata.slice().sort((a, b) => {
      const priceA = Number(a.price)
      const priceB = Number(b.price)
      const hasPriceA = Number.isFinite(priceA)
      const hasPriceB = Number.isFinite(priceB)
      if (hasPriceA && hasPriceB && priceA !== priceB) {
        return priceB - priceA
      }
      if (hasPriceA && !hasPriceB) return -1
      if (!hasPriceA && hasPriceB) return 1
      return (baseOrder.get(a.key) ?? 0) - (baseOrder.get(b.key) ?? 0)
    })
  }, [rowMetadata])

  const { normalizedRows, minRatio } = useMemo(() => {
    if (!sortedRows.length) {
      return { normalizedRows: [], minRatio: 0 }
    }
    const volumes = sortedRows.map((row) => {
      const numericVolume = Number(row.volume)
      return Number.isFinite(numericVolume) && numericVolume > 0 ? numericVolume : 0
    })
    const sum = volumes.reduce((acc, value) => acc + value, 0)
    const fallback = sum === 0 ? 1 / sortedRows.length : null
    let smallestRatio = Infinity
    const mapped = sortedRows.map((row, index) => {
      const numericVolume = volumes[index]
      const ratio = sum > 0 ? numericVolume / sum : fallback ?? 0
      if (ratio > 0 && ratio < smallestRatio) {
        smallestRatio = ratio
      }
      return {
        ...row,
        numericVolume,
        ratio,
        volumePercent: ratio * 100,
      }
    })
    return { normalizedRows: mapped, minRatio: Number.isFinite(smallestRatio) ? smallestRatio : 0 }
  }, [sortedRows])

  const matchingRowIndex = useMemo(() => {
    if (!Number.isFinite(referenceLastPrice)) return -1
    return normalizedRows.findIndex((row) => {
      const numericPrice = Number(row.price)
      return Number.isFinite(numericPrice) && Math.abs(numericPrice - referenceLastPrice) < 0.0001
    })
  }, [referenceLastPrice, normalizedRows])

  const estimatedMinHeight = useMemo(() => {
    if (!minRatio || minRatio <= 0) return 32
    const estimate = minRatio * HEATMAP_REFERENCE_HEIGHT
    return Math.max(24, estimate)
  }, [minRatio])
  const baseFontSize = useMemo(() => {
    const value = (estimatedMinHeight - 16) / 3
    return Math.max(11, Math.min(18, Math.round(value)))
  }, [estimatedMinHeight])

  if (!normalizedRows.length) {
    return (
      <div className="five-level-empty">
        <Empty description="暂无可用曲线" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  return (
    <div className="depth-chart-panel depth-panel-volume volume-heatmap-panel">
      <div className="depth-chart-header" />
      <div className="volume-treemap-grid">
        {normalizedRows.map((row, index) => {
          const safeRatio = clampRatio(row.ratio || 0)
          const grow = Math.max(safeRatio, 0.02)
          const backgroundColor = Number.isFinite(row.numericVolume)
            ? getHeatmapColor(row.side, safeRatio)
            : 'rgba(255,255,255,0.06)'
          const isMatchingRow = matchingRowIndex === index
          const priceColor = getPriceComparisonColor(row.price, previousClose)
          const textHighlight = isMatchingRow ? PRICE_MATCH_HIGHLIGHT : undefined
          return (
            <div
              key={row.key}
              className={`treemap-node ${row.side}${isMatchingRow ? ' matching' : ''}`}
              style={{
                flexGrow: grow,
                flexBasis: 0,
                backgroundColor,
              }}
            >
              <div className="treemap-node-line">
                <span
                  className="node-level"
                  style={{ fontSize: `${baseFontSize}px`, color: textHighlight }}
                >
                  {row.label}
                </span>
                <span
                  className={`node-price${isMatchingRow ? ' current' : ''}`}
                  style={{ fontSize: `${Math.round(baseFontSize * 1.05)}px`, color: priceColor }}
                >
                  {formatPriceValue(row.price)}
                </span>
                <span
                  className="node-volume"
                  style={{ fontSize: `${baseFontSize}px`, color: textHighlight }}
                >
                  {formatDepthVolume(row.numericVolume)}
                </span>
                <span
                  className="node-ratio"
                  style={{ fontSize: `${Math.max(10, baseFontSize - 1)}px`, color: textHighlight }}
                >
                  {`${safeRatio > 0 ? (safeRatio * 100).toFixed(1) : '0.0'}%`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const buildSeriesSet = (entries, type) => {
  const isVolume = type === 'volume'
  const bestSellIndex = SELL_LEVEL_INDEX >= 0 ? SELL_LEVEL_INDEX : SELL_LEVELS.length - 1
  const bestBuyIndex = BUY_LEVEL_INDEX
  const buyValues = entries.map((entry) => {
    if (isVolume) return entry.sellVolumes?.[bestSellIndex] ?? null
    return entry.sells?.[bestSellIndex] ?? null
  })
  const sellValues = entries.map((entry) => {
    if (isVolume) return entry.buyVolumes?.[bestBuyIndex] ?? null
    return entry.buys?.[bestBuyIndex] ?? null
  })
  const lines = [
    {
      key: `buy-${type}`,
      label: isVolume ? '买一量' : '买一价',
      side: 'sell',
      color: isVolume ? SELL_VOLUME_LINE_COLOR : BUY_PRICE_LINE_COLOR,
      fill: isVolume ? SELL_VOLUME_FILL_COLOR : BUY_PRICE_FILL_COLOR,
      values: buyValues,
    },
    {
      key: `sell-${type}`,
      label: isVolume ? '卖一量' : '卖一价',
      side: 'buy',
      color: isVolume ? BUY_VOLUME_LINE_COLOR : SELL_PRICE_LINE_COLOR,
      fill: isVolume ? BUY_VOLUME_FILL_COLOR : SELL_PRICE_FILL_COLOR,
      values: sellValues,
    },
  ]
  let min = Infinity
  let max = -Infinity
  lines.forEach((line) => {
    line.values.forEach((value) => {
      if (value === null || value === undefined) return
      if (value < min) min = value
      if (value > max) max = value
    })
  })
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0
    max = 1
  }
  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min * 0.02)
    min -= delta
    max += delta
  }
  return { lines, min, max }
}

const buildLineCoords = (values, min, max, width, height) => {
  if (!Array.isArray(values) || !values.length) return []
  const range = max - min || 1
  const coords = []
  values.forEach((value, index) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      coords.push(null)
      return
    }
    const normalized = (value - min) / range
    const x = Math.min(width, Math.max(0, normalized * width))
    const orderRatio = values.length > 1 ? (values.length - 1 - index) / (values.length - 1) : 0
    const y = Math.min(height, Math.max(0, orderRatio * height))
    coords.push({ x, y })
  })
  return coords
}

const buildPathFromCoords = (coords) => {
  let path = ''
  let started = false
  coords.forEach((point) => {
    if (!point) {
      started = false
      return
    }
    const prefix = started ? 'L' : 'M'
    path += `${prefix}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    started = true
  })
  return path
}

const buildAreaPath = (coords, width, side) => {
  const filtered = coords.filter(Boolean)
  if (!filtered.length) return ''
  const parts = [`M${filtered[0].x.toFixed(2)} ${filtered[0].y.toFixed(2)}`]
  for (let i = 1; i < filtered.length; i += 1) {
    parts.push(`L${filtered[i].x.toFixed(2)} ${filtered[i].y.toFixed(2)}`)
  }
  const last = filtered[filtered.length - 1]
  const first = filtered[0]
  if (side === 'sell') {
    parts.push(`L0 ${last.y.toFixed(2)}`)
    parts.push(`L0 ${first.y.toFixed(2)}`)
  } else {
    parts.push(`L${width.toFixed(2)} ${last.y.toFixed(2)}`)
    parts.push(`L${width.toFixed(2)} ${first.y.toFixed(2)}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

function DepthChartPanel({ title, entries, startLabel, endLabel, type, referencePrevClose, referenceLastPrice }) {
  const { lines, min, max } = useMemo(() => buildSeriesSet(entries, type), [entries, type])
  const viewWidth = 180
  const viewHeight = 320
  const gridLines = 6

  const formatAxisValue = (value) => {
    if (!Number.isFinite(value)) return '--'
    if (type === 'volume') {
      return formatDepthVolume(value)
    }
    return Number(value).toFixed(2)
  }

  const axisTicks = useMemo(() => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return []
    const steps = 4
    return Array.from({ length: steps + 1 }).map((_, index) => {
      const ratio = steps === 0 ? 0 : index / steps
      const value = min + (max - min) * ratio
      return {
        key: `axis-${index}`,
        position: ratio,
        label: type === 'price' ? formatAxisValue(value) : '',
      }
    })
  }, [min, max, type])

  const lineShapes = useMemo(() => {
    return lines.map((line) => {
      const coords = buildLineCoords(line.values, min, max, viewWidth, viewHeight)
      return {
        ...line,
        coords,
        path: buildPathFromCoords(coords),
        area: line.fill ? buildAreaPath(coords, viewWidth, line.side) : null,
      }
    })
  }, [lines, min, max, viewWidth, viewHeight])

  return (
    <div className={`depth-chart-panel ${type === 'price' ? 'depth-panel-price' : 'depth-panel-volume'}`}>
      {title ? (
        <div className="depth-chart-header">
          <span>{title}</span>
        </div>
      ) : null}
      <div className="depth-axis-top">
        <div className="axis-base-line" />
        {axisTicks.map((tick) => (
          <span
            key={tick.key}
            className="axis-tick"
            style={{ left: `${tick.position * 100}%` }}
          >
            <span className="tick-line" />
            {tick.label && <span className="tick-label">{tick.label}</span>}
          </span>
        ))}
      </div>
      <div className="depth-chart-surface">
        <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none">
          {Array.from({ length: gridLines + 1 }).map((_, index) => {
            const y = (index / gridLines) * viewHeight
            return (
              <line
                key={`grid-${index}`}
                x1="0"
                y1={y}
                x2={viewWidth}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            )
          })}
          {lineShapes.map((shape) => (
            <g key={shape.key}>
              {shape.path && (
                <path
                  d={shape.path}
                  fill="none"
                  stroke={shape.color}
                  strokeWidth={type === 'price' ? 1.6 : 2}
                  strokeLinecap="round"
                  opacity={shape.side === 'sell' ? 0.98 : 1}
                />
              )}
            </g>
          ))}
          {type === 'price' && Number.isFinite(referencePrevClose) && min < max && renderReferenceLine(referencePrevClose, viewWidth, viewHeight, min, max, 'reference-line prev')}
          {type === 'price' && Number.isFinite(referenceLastPrice) && min < max && renderReferenceLine(referenceLastPrice, viewWidth, viewHeight, min, max, 'reference-line last')}
        </svg>
      </div>
    </div>
  )
}

const renderReferenceLine = (value, width, height, min, max, className) => {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
    return null
  }
  const ratio = (value - min) / (max - min)
  const x = Math.min(width, Math.max(0, ratio * width))
  return (
    <line
      className={className}
      x1={x}
      x2={x}
      y1={0}
      y2={height}
      strokeDasharray="4 4"
    />
  )
}
