import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'

/**
 * TradingView Lightweight Charts - K线图 + 成交量图组件
 * @param {Object} props
 * @param {Array} props.data - K线数据 [{time: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000}]
 * @param {Number} props.height - 图表总高度，默认 600
 * @param {String} props.title - 图表标题
 * @param {Function} props.onLoadMore - 加载更多历史数据的回调函数
 */
function StockChart({ data = [], height = 600, title = '', onLoadMore }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candlestickSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const [isChartReady, setIsChartReady] = useState(false)
  const isLoadingRef = useRef(false)

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return

    let handleResize = null
    const timerId = setTimeout(() => {
      if (!chartContainerRef.current) return

      try {
        const containerWidth = chartContainerRef.current.clientWidth || 800

        // 创建图表 (v3.8 API)
        const chart = createChart(chartContainerRef.current, {
          width: containerWidth,
          height: height,
          layout: {
            backgroundColor: '#ffffff',
            textColor: '#333',
          },
          grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: '#d1d4dc',
          },
          timeScale: {
            borderColor: '#d1d4dc',
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 12,
            barSpacing: 10,
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: true,
          },
          localization: {
            locale: 'zh-CN',
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

        console.log('TradingView图表初始化完成')

        // 监听时间轴可见范围变化（用于左拉加载更多）
        chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
          if (!logicalRange || !onLoadMore || isLoadingRef.current) return

          // 当滚动到左边界附近时，触发加载更多
          if (logicalRange.from < 10) {
            console.log('触发加载更多历史数据')
            isLoadingRef.current = true
            onLoadMore().finally(() => {
              isLoadingRef.current = false
            })
          }
        })

        // 响应式处理
        handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.resize(chartContainerRef.current.clientWidth || 800, height)
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

  // 更新数据
  useEffect(() => {
    if (!isChartReady || !candlestickSeriesRef.current || !volumeSeriesRef.current || !data || data.length === 0) {
      console.log('图表未就绪或无数据:', { isChartReady, hasData: data?.length > 0 })
      return
    }

    try {
      console.log('开始设置图表数据:', data.length, '条')

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

      console.log('K线数据样本:', candlestickData.slice(0, 2))
      console.log('成交量数据样本:', volumeData.slice(0, 2))

      candlestickSeriesRef.current.setData(candlestickData)
      volumeSeriesRef.current.setData(volumeData)

      // 自动适应内容
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent()
      }

      console.log('图表数据设置完成')
    } catch (error) {
      console.error('Failed to set chart data:', error)
    }
  }, [data, isChartReady])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {title && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '10px',
            color: '#333',
          }}
        >
          {title}
        </div>
      )}
      <div
        ref={chartContainerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: `${height}px`,
        }}
      />
    </div>
  )
}

export default StockChart
