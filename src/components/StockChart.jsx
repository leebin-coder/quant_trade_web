import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import { Select, ConfigProvider } from 'antd'

/**
 * TradingView Lightweight Charts - K线图 + 成交量图组件
 * @param {Object} props
 * @param {Array} props.data - K线数据 [{time: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000}]
 * @param {Number} props.height - 图表总高度，默认 600
 * @param {String} props.title - 图表标题
 */
function StockChart({ data = [], height = 600, title = '' }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candlestickSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const dataRef = useRef([]) // 存储最新的数据，供监听器使用
  const selectedDataRef = useRef(null) // 存储最新的selectedData，供监听器使用
  const lastClickedDataRef = useRef(null) // 存储最后点击的数据
  const [isChartReady, setIsChartReady] = useState(false)
  const [adjustType, setAdjustType] = useState('none') // 复权类型: none-未复权, qfq-前复权, hfq-后复权
  const [selectedData, setSelectedData] = useState(null) // 当前悬停或选中的K线数据

  // 同步最新数据到 ref
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // 同步 selectedData 到 ref
  useEffect(() => {
    selectedDataRef.current = selectedData
  }, [selectedData])

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return

    let handleResize = null
    let handleChartClick = null
    const timerId = setTimeout(() => {
      if (!chartContainerRef.current) return

      try {
        // 动态计算图表宽度 = 容器宽度
        const containerWidth = chartContainerRef.current.clientWidth || 1000

        // 创建图表 (v3.8 API)
        const chart = createChart(chartContainerRef.current, {
          width: containerWidth,
          height: 540,
          layout: {
            backgroundColor: '#ffffff',
            textColor: '#333',
          },
          grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
          },
          crosshair: {
            mode: 1, // CrosshairMode.Normal - 支持鼠标悬停和点击
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: true,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
          rightPriceScale: {
            borderColor: '#d1d4dc',
          },
          timeScale: {
            borderColor: '#d1d4dc',
            timeVisible: false,  // 不显示时间，只显示日期
            secondsVisible: false,
            rightOffset: 12,
            barSpacing: 6,  // 固定K线柱子宽度
            minBarSpacing: 0.5,  // 最小柱子间距
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: true,
          },
          localization: {
            locale: 'zh-CN',
            dateFormat: 'yyyy-MM-dd',  // 只显示日期格式
          },
        })

        // 添加K线系列 (v3.8 API)
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#ef232a',
          downColor: '#14b143',
          borderUpColor: '#ef232a',
          borderDownColor: '#14b143',
          wickUpColor: '#ef232a',
          wickDownColor: '#14b143',
        })

        // 设置K线价格刻度 - 占用上70%
        candlestickSeries.applyOptions({
          priceScaleId: 'right',
        })

        chart.priceScale('right').applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.32,
          },
        })

        // 添加成交量系列 (v3.8 API)
        const volumeSeries = chart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
          scaleMargins: {
            top: 0.7,
            bottom: 0,
          },
        })

        chartRef.current = chart
        candlestickSeriesRef.current = candlestickSeries
        volumeSeriesRef.current = volumeSeries
        setIsChartReady(true)

        // 监听可见范围变化，更新最高价和最低价标记
        const timeScale = chart.timeScale()
        timeScale.subscribeVisibleLogicalRangeChange(() => {
          updateHighLowPriceMarkers()
        })

        // 监听十字线移动，更新选中的数据
        chart.subscribeCrosshairMove((param) => {
          if (param.time) {
            // TradingView 返回的时间可能是对象格式 {day, month, year} 或字符串
            let timeStr
            if (typeof param.time === 'object') {
              // 转换为 YYYY-MM-DD 格式
              const { year, month, day } = param.time
              timeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            } else {
              timeStr = param.time
            }

            console.log('🔍 查找数据 - timeStr:', timeStr)

            // 从最新数据中找到对应的完整数据（包含volume等）
            const fullData = dataRef.current.find(d => d.time === timeStr)

            if (fullData) {
              console.log('✅ 找到数据:', timeStr)
              setSelectedData(fullData)
            } else {
              console.log('❌ 未找到数据 - timeStr:', timeStr)
            }
          } else {
            // 鼠标移出图表区域，恢复显示最后点击的数据
            if (lastClickedDataRef.current) {
              console.log('👈 鼠标移出 - 恢复数据')
              setSelectedData(lastClickedDataRef.current)
            }
          }
        })

        // 监听图表点击事件
        handleChartClick = () => {
          // 如果当前有悬停的数据，将其设为最后点击的数据
          if (selectedDataRef.current) {
            console.log('🖱️ 点击锁定数据:', selectedDataRef.current.time)
            lastClickedDataRef.current = selectedDataRef.current
          }
        }

        chartContainerRef.current.addEventListener('click', handleChartClick)

        // 响应式处理 - 动态调整图表宽度
        handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            const newWidth = chartContainerRef.current.clientWidth || 1000
            chartRef.current.resize(newWidth, 540)
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        console.error('Failed to create chart:', error)
      }
    }, 100)

    // 清理函数
    return () => {
      clearTimeout(timerId)
      if (handleResize) {
        window.removeEventListener('resize', handleResize)
      }
      if (handleChartClick && chartContainerRef.current) {
        chartContainerRef.current.removeEventListener('click', handleChartClick)
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
      candlestickSeriesRef.current = null
      volumeSeriesRef.current = null
      setIsChartReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  // 计算可见区域内的最高价和最低价，并添加标记
  const updateHighLowPriceMarkers = () => {
    if (!chartRef.current || !candlestickSeriesRef.current || !data || data.length === 0) {
      return
    }

    try {
      const timeScale = chartRef.current.timeScale()
      const visibleLogicalRange = timeScale.getVisibleLogicalRange()

      if (!visibleLogicalRange) return

      // 获取可见范围的索引
      const fromIndex = Math.max(0, Math.floor(visibleLogicalRange.from))
      const toIndex = Math.min(data.length - 1, Math.ceil(visibleLogicalRange.to))

      // 在可见范围内查找最高价和最低价
      let maxPrice = -Infinity
      let minPrice = Infinity
      let maxPriceIndex = -1
      let minPriceIndex = -1

      for (let i = fromIndex; i <= toIndex; i++) {
        if (data[i].high > maxPrice) {
          maxPrice = data[i].high
          maxPriceIndex = i
        }
        if (data[i].low < minPrice) {
          minPrice = data[i].low
          minPriceIndex = i
        }
      }

      // 清除旧的标记
      candlestickSeriesRef.current.setMarkers([])

      // 创建新的标记数组
      const markers = []

      // 添加最高价标记
      if (maxPriceIndex >= 0) {
        markers.push({
          time: data[maxPriceIndex].time,
          position: 'aboveBar',
          color: '#ef232a',
          shape: 'arrowDown',
          text: `最高 ${maxPrice.toFixed(2)}`,
        })
      }

      // 添加最低价标记
      if (minPriceIndex >= 0) {
        markers.push({
          time: data[minPriceIndex].time,
          position: 'belowBar',
          color: '#14b143',
          shape: 'arrowUp',
          text: `最低 ${minPrice.toFixed(2)}`,
        })
      }

      // 应用标记
      candlestickSeriesRef.current.setMarkers(markers)

      console.log('更新最高最低价标记:', {
        可见范围: `${fromIndex} ~ ${toIndex}`,
        最高价: maxPrice,
        最低价: minPrice,
      })
    } catch (error) {
      console.error('更新最高最低价标记失败:', error)
    }
  }

  // 更新数据
  useEffect(() => {
    if (!isChartReady || !candlestickSeriesRef.current || !volumeSeriesRef.current || !data || data.length === 0) {
      return
    }

    try {
      // 设置K线数据
      const candlestickData = data.map(item => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))

      // 设置成交量数据（根据涨跌设置颜色）
      const volumeData = data.map(item => ({
        time: item.time,
        value: item.volume || 0,
        color: item.close >= item.open ? 'rgba(239, 35, 42, 0.5)' : 'rgba(20, 177, 67, 0.5)',
      }))

      console.log('📊 图表数据已加载:', data.length, '条')
      console.log('   时间格式示例:', data[0]?.time, typeof data[0]?.time)

      candlestickSeriesRef.current.setData(candlestickData)
      volumeSeriesRef.current.setData(volumeData)

      // 数据加载完成后，初始更新最高最低价标记
      setTimeout(() => {
        updateHighLowPriceMarkers()
      }, 100)

      // 默认选中最新一个交易日，并设为初始点击数据
      if (data.length > 0) {
        const latestData = data[data.length - 1]
        setSelectedData(latestData)
        lastClickedDataRef.current = latestData
      }
    } catch (error) {
      console.error('Failed to set chart data:', error)
    }
  }, [data, isChartReady])

  // 计算涨幅
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return { changePercent: 0, changeAmount: 0 }
    const changeAmount = current - previous
    const changePercent = (changeAmount / previous) * 100
    return { changePercent, changeAmount }
  }

  // 获取前一个交易日的收盘价
  const getPreviousClose = (currentIndex) => {
    if (currentIndex > 0) {
      return data[currentIndex - 1].close
    }
    return null
  }

  // 获取当前选中数据的详细信息
  const getDisplayData = () => {
    if (!selectedData) return null

    const currentIndex = data.findIndex(d => d.time === selectedData.time)
    const previousClose = getPreviousClose(currentIndex)
    const { changePercent, changeAmount } = calculateChange(selectedData.close, previousClose)

    return {
      ...selectedData,
      changePercent,
      changeAmount,
    }
  }

  const displayData = getDisplayData()

  // 监控selectedData变化
  useEffect(() => {
    if (selectedData) {
      console.log('📈 右侧面板更新 -', selectedData.time, '开:', selectedData.open, '收:', selectedData.close)
    }
  }, [selectedData])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* 标题 */}
      {title && (
        <div
          style={{
            textAlign: 'left',
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '20px',
            marginLeft: '20px',
            color: '#1d1d1f',
          }}
        >
          {title}
        </div>
      )}

      {/* 图表和数据看板容器 */}
      <div style={{ display: 'flex', gap: '40px', width: '100%', alignItems: 'flex-start' }}>
        {/* 图表区域 - 自适应宽度，从左侧开始 */}
        <div style={{ flex: '1', minWidth: 0, position: 'relative' }}>
          {/* 复权选择下拉框 - 往左调整，不盖住纵坐标 */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '80px',
              zIndex: 10,
            }}
          >
            <ConfigProvider
              theme={{
                components: {
                  Select: {
                    optionSelectedBg: '#e6f7ff',
                    optionSelectedColor: '#1890ff',
                    controlPaddingHorizontal: 8,
                    selectorBg: '#e6f7ff',
                    colorBgContainer: '#e6f7ff',
                  },
                },
              }}
            >
              <Select
                value={adjustType}
                onChange={setAdjustType}
                style={{ width: 60 }}
                size="small"
                suffixIcon={null}
                popupMatchSelectWidth={false}
                options={[
                  { label: '未复权', value: 'none' },
                  { label: '前复权', value: 'qfq' },
                  { label: '后复权', value: 'hfq' },
                ]}
              />
            </ConfigProvider>
          </div>

          {/* K线图 */}
          <div
            ref={chartContainerRef}
            style={{
              position: 'relative',
              width: '100%',
              height: '540px',
            }}
          />
        </div>

        {/* 右侧：数据看板 - 固定200px */}
        <div
          style={{
            width: '200px',
            flexShrink: 0,
            padding: '16px 0 40px 20px',
          }}
        >
          {/* 交易日期 */}
          <div
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1d1d1f',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            {displayData?.time || '--'}
          </div>

          {/* 数据网格 - 4行2列 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 16px', rowGap: '18px' }}>
            {/* 第1行：开盘价、收盘价 */}
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>开盘价</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#1d1d1f' }}>
                {displayData ? displayData.open.toFixed(2) : '--'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>收盘价</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#1d1d1f' }}>
                {displayData ? displayData.close.toFixed(2) : '--'}
              </div>
            </div>

            {/* 第2行：最高、最低 */}
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>最高</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#ef232a' }}>
                {displayData ? displayData.high.toFixed(2) : '--'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>最低</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#14b143' }}>
                {displayData ? displayData.low.toFixed(2) : '--'}
              </div>
            </div>

            {/* 第3行：涨幅(%)、涨幅(¥) */}
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>涨幅(%)</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: displayData
                    ? displayData.changePercent > 0
                      ? '#ef232a'
                      : displayData.changePercent < 0
                      ? '#14b143'
                      : '#666'
                    : '#666',
                }}
              >
                {displayData ? (
                  <>
                    {displayData.changePercent > 0 ? '+' : ''}
                    {displayData.changePercent.toFixed(2)}%
                  </>
                ) : (
                  '--'
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>涨幅(¥)</div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: displayData
                    ? displayData.changeAmount > 0
                      ? '#ef232a'
                      : displayData.changeAmount < 0
                      ? '#14b143'
                      : '#666'
                    : '#666',
                }}
              >
                {displayData ? (
                  <>
                    {displayData.changeAmount > 0 ? '+' : ''}
                    {displayData.changeAmount.toFixed(2)}
                  </>
                ) : (
                  '--'
                )}
              </div>
            </div>

            {/* 第4行：成交量(跨2列) */}
            <div style={{ gridColumn: '1 / 3' }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>成交量</div>
              <div style={{ fontSize: '16px', fontWeight: '500', color: '#1d1d1f' }}>
                {displayData ? `${(displayData.volume / 10000).toFixed(2)} 万手` : '--'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockChart
