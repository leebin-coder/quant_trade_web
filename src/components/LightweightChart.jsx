import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'

/**
 * TradingView Lightweight Charts 组件
 * @param {Object} props
 * @param {Array} props.data - K线数据 [{time: '2023-01-01', open: 100, high: 110, low: 90, close: 105}]
 * @param {Number} props.height - 图表高度，默认 400
 * @param {String} props.title - 图表标题
 */
function LightweightChart({ data = [], height = 400, title = '' }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const [isChartReady, setIsChartReady] = useState(false)

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return

    let handleResize = null
    const timerId = setTimeout(() => {
      if (!chartContainerRef.current) return

      try {
        const containerWidth = chartContainerRef.current.clientWidth || 800

        const chart = createChart(chartContainerRef.current, {
          width: containerWidth,
          height: height,
          layout: {
            background: { color: '#ffffff' },
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
          },
        })

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#ef232a',
          downColor: '#14b143',
          borderUpColor: '#ef232a',
          borderDownColor: '#14b143',
          wickUpColor: '#ef232a',
          wickDownColor: '#14b143',
        })

        chartRef.current = chart
        seriesRef.current = candlestickSeries
        setIsChartReady(true)

        // 响应式处理
        handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth || 800,
            })
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
      seriesRef.current = null
      setIsChartReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 更新数据
  useEffect(() => {
    if (!isChartReady || !seriesRef.current || !data || data.length === 0) {
      return
    }

    try {
      seriesRef.current.setData(data)
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent()
      }
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

export default LightweightChart
