import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import { Select, ConfigProvider, Checkbox, Radio, Popover, message, Tooltip } from 'antd'
import { InfoCircleOutlined, EnvironmentOutlined, CopyOutlined, QuestionCircleOutlined, RightOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { indicatorDescriptions, popoverConfig, indicatorDocsId } from '../docs/indicators/index'
import './StockChart.css'

/**
 * TradingView Lightweight Charts - K线图 + 成交量图组件
 * @param {Object} props
 * @param {Array} props.data - K线数据 [{time: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000, ...}]
 * @param {Number} props.height - 图表总高度，默认 600
 * @param {String} props.title - 图表标题
 * @param {Object} props.stockInfo - 股票详细信息
 * @param {Object} props.companyDetail - 公司详情数据
 * @param {String} props.period - 时间周期：minute-分时, daily-日线, weekly-周线, monthly-月线, quarterly-季线, yearly-年线
 * @param {Function} props.onPeriodChange - 时间周期变化回调
 * @param {Number} props.adjustFlag - 复权类型: 1-后复权, 2-前复权, 3-不复权
 * @param {Function} props.onAdjustFlagChange - 复权类型变化回调
 * @param {Function} props.onChartReady - 图表渲染完成回调
 * @param {Boolean} props.loading - 是否正在加载数据
 * @param {Function} props.onOpenKnowledge - 打开知识库回调，参数为文档节点ID
 */
function StockChart({ data = [], height = 600, title = '', stockInfo = null, companyDetail = null, period = 'daily', onPeriodChange, adjustFlag = 3, onAdjustFlagChange, onChartReady, loading = false, onOpenKnowledge }) {
  const chartContainerRef = useRef(null)
  const volumeChartContainerRef = useRef(null) // 中间成交量图表容器
  const lowerChartContainerRef = useRef(null) // 下方指标图表容器
  const chartRef = useRef(null)
  const volumeChartRef = useRef(null) // 中间成交量图表
  const lowerChartRef = useRef(null) // 下方指标图表
  const candlestickSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null) // 成交量系列引用
  const dataRef = useRef([]) // 存储最新的数据，供监听器使用
  const selectedDataRef = useRef(null) // 存储最新的selectedData，供监听器使用
  const lastClickedDataRef = useRef(null) // 存储最后点击的数据
  const [isChartReady, setIsChartReady] = useState(false)
  const [isVolumeChartReady, setIsVolumeChartReady] = useState(false) // 中间成交量图表是否准备好
  const [isLowerChartReady, setIsLowerChartReady] = useState(false) // 下方图表是否准备好
  // 将 adjustFlag (1,2,3) 映射为 adjustType ('hfq','qfq','none')
  const adjustType = adjustFlag === 1 ? 'hfq' : adjustFlag === 2 ? 'qfq' : 'none'
  const [selectedData, setSelectedData] = useState(null) // 当前悬停或选中的K线数据
  const [indicators, setIndicators] = useState([]) // 选中的上方技术指标
  const [lowerIndicator, setLowerIndicator] = useState('KDJ') // 选中的下方技术指标,默认选中KDJ(单选)
  const indicatorSeriesRefs = useRef({}) // 存储上方技术指标系列的引用
  const lowerIndicatorSeriesRefs = useRef({}) // 存储下方技术指标系列的引用

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
    let resizeObserver = null
    const timerId = setTimeout(() => {
      if (!chartContainerRef.current) return

      try {
        // 动态计算图表宽度和高度
        const containerWidth = chartContainerRef.current.clientWidth || 1000
        const containerHeight = chartContainerRef.current.clientHeight || 500

        console.log('📊 图表初始化 - 容器尺寸:', { containerWidth, containerHeight })

        // 创建图表 (v3.8 API)
        const chart = createChart(chartContainerRef.current, {
          width: containerWidth,
          height: containerHeight,
          layout: {
            backgroundColor: 'rgb(28, 28, 28)',
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { color: '#2a2a2a' },
            horzLines: { color: '#2a2a2a' },
          },
          crosshair: {
            mode: 1,
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
          leftPriceScale: {
            visible: false,
          },
          rightPriceScale: {
            borderColor: '#d1d4dc',
            minimumWidth: 80,
            mode: 0,
            autoScale: true,
          },
          timeScale: {
            visible: true,  // 显示时间轴
            borderColor: '#d1d4dc',
            timeVisible: false,
            secondsVisible: false,
            rightOffset: 12,
            barSpacing: 6,
            minBarSpacing: 0.5,
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: true,
          },
          localization: {
            locale: 'zh-CN',
            dateFormat: 'yyyy-MM-dd',
          },
        })

        // 添加K线系列 (v3.8 API) - 使用主价格刻度
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: '#ef232a',
          downColor: '#14b143',
          borderUpColor: '#ef232a',
          borderDownColor: '#14b143',
          wickUpColor: '#ef232a',
          wickDownColor: '#14b143',
          priceScaleId: 'right',
        })

        // K线价格刻度设置 - 占用上方60%空间
        // top: 从顶部留白的百分比, bottom: 从底部留白的百分比
        chart.priceScale('right').applyOptions({
          autoScale: true,
          alignLabels: true,
          scaleMargins: {
            top: 0.05,      // 顶部留5%空白，避免被选择器覆盖
            bottom: 0.40,   // 底部留40%空白 (5% - 65%)
          },
        })

        // 添加成交量系列 - 使用独立价格刻度
        const volumeSeries = chart.addHistogramSeries({
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',  // 独立的价格刻度ID
        })

        // 成交量价格刻度设置 - 占用中间15%空间 (66% - 81%)
        chart.priceScale('volume').applyOptions({
          visible: false,  // 隐藏volume的价格刻度
          autoScale: true,
          alignLabels: false,
          scaleMargins: {
            top: 0.66,     // 顶部留66%空白
            bottom: 0.19,  // 底部留19%空白 (66% - 81%)
          },
        })

        // 创建一个占位系列来初始化 'lower' 价格刻度
        const lowerPlaceholder = chart.addLineSeries({
          priceScaleId: 'lower',
          visible: false,
        })
        lowerPlaceholder.setData([{ time: '2020-01-01', value: 0 }])

        // 技术指标价格刻度设置 - 占用下方12%空间 (86% - 98%)
        chart.priceScale('lower').applyOptions({
          visible: false,  // 隐藏lower的价格刻度
          autoScale: true,
          alignLabels: false,
          mode: 0,  // 正常模式
          scaleMargins: {
            top: 0.86,     // 顶部留86%空白（指标区域从86%开始）
            bottom: 0.02,   // 底部留2%空白
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

            // 从最新数据中找到对应的完整数据（包含volume等）
            const fullData = dataRef.current.find(d => d.time === timeStr)

            if (fullData) {
              setSelectedData(fullData)
            }
          } else {
            // 鼠标移出图表区域，恢复显示最后点击的数据
            if (lastClickedDataRef.current) {
              setSelectedData(lastClickedDataRef.current)
            }
          }
        })

        // 监听图表点击事件
        handleChartClick = () => {
          // 如果当前有悬停的数据，将其设为最后点击的数据
          if (selectedDataRef.current) {
            lastClickedDataRef.current = selectedDataRef.current
          }
        }

        chartContainerRef.current.addEventListener('click', handleChartClick)

        // 响应式处理 - 动态调整图表宽度和高度
        handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            const newWidth = chartContainerRef.current.clientWidth || 1000
            const newHeight = chartContainerRef.current.clientHeight || 500
            chartRef.current.resize(newWidth, newHeight)
          }
        }

        window.addEventListener('resize', handleResize)

        // 使用 ResizeObserver 监听容器大小变化（比 window resize 更精确）
        if (typeof ResizeObserver !== 'undefined' && chartContainerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            handleResize()
          })
          resizeObserver.observe(chartContainerRef.current)
        }
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
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (handleChartClick && chartContainerRef.current) {
        chartContainerRef.current.removeEventListener('click', handleChartClick)
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
      candlestickSeriesRef.current = null
      setIsChartReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 初始化下方技术指标图表
  useEffect(() => {
    if (!lowerChartContainerRef.current) return

    let handleLowerResize = null
    const timerId = setTimeout(() => {
      try {
        const containerWidth = lowerChartContainerRef.current.clientWidth || 1000

        // 创建下方技术指标图表
        const lowerChart = createChart(lowerChartContainerRef.current, {
          width: containerWidth,
          height: 300,
          layout: {
            backgroundColor: 'rgb(28, 28, 28)',
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { color: '#2a2a2a' },
            horzLines: { color: '#2a2a2a' },
          },
          crosshair: {
            mode: 1,
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
          leftPriceScale: {
            visible: false,
          },
          rightPriceScale: {
            borderColor: '#d1d4dc',
            minimumWidth: 80,
            mode: 0,
            autoScale: true,
          },
          timeScale: {
            visible: true,
            borderColor: '#d1d4dc',
            timeVisible: false,
            secondsVisible: false,
            rightOffset: 12,
            barSpacing: 6,
            minBarSpacing: 0.5,
            fixLeftEdge: false,
            fixRightEdge: false,
            lockVisibleTimeRangeOnResize: true,
          },
          localization: {
            locale: 'zh-CN',
            dateFormat: 'yyyy-MM-dd',
          },
        })

        lowerChartRef.current = lowerChart
        setIsLowerChartReady(true)

        // 响应式处理
        handleLowerResize = () => {
          if (lowerChartContainerRef.current && lowerChartRef.current) {
            const newWidth = lowerChartContainerRef.current.clientWidth || 1000
            lowerChartRef.current.resize(newWidth, 300)
          }
        }

        window.addEventListener('resize', handleLowerResize)

        // 同步时间轴
        if (chartRef.current) {
          lowerChart.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
            if (chartRef.current && timeRange) {
              chartRef.current.timeScale().setVisibleLogicalRange(timeRange)
            }
          })

          chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
            if (lowerChart && timeRange) {
              lowerChart.timeScale().setVisibleLogicalRange(timeRange)
            }
          })
        }
      } catch (error) {
        console.error('Failed to create lower chart:', error)
      }
    }, 100)

    // 清理函数
    return () => {
      clearTimeout(timerId)
      if (handleLowerResize) {
        window.removeEventListener('resize', handleLowerResize)
      }
      if (lowerChartRef.current) {
        lowerChartRef.current.remove()
        lowerChartRef.current = null
      }
      setIsLowerChartReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  // 计算 MA (移动平均线)
  const calculateMA = (data, period) => {
    const result = []
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: null })
        continue
      }
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close
      }
      result.push({ time: data[i].time, value: sum / period })
    }
    return result
  }

  // 计算 EMA (指数移动平均线)
  const calculateEMA = (data, period) => {
    const result = []
    const multiplier = 2 / (period + 1)

    // 第一个值使用 SMA
    let sum = 0
    for (let i = 0; i < Math.min(period, data.length); i++) {
      sum += data[i].close
    }
    let ema = sum / Math.min(period, data.length)

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: null })
        continue
      }
      if (i === period - 1) {
        result.push({ time: data[i].time, value: ema })
      } else {
        ema = (data[i].close - ema) * multiplier + ema
        result.push({ time: data[i].time, value: ema })
      }
    }
    return result
  }

  // 计算 BOLL (布林带)
  const calculateBOLL = (data, period = 20, stdDev = 2) => {
    const middle = []
    const upper = []
    const lower = []

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        middle.push({ time: data[i].time, value: null })
        upper.push({ time: data[i].time, value: null })
        lower.push({ time: data[i].time, value: null })
        continue
      }

      // 计算中轨 (MA)
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close
      }
      const ma = sum / period

      // 计算标准差
      let variance = 0
      for (let j = 0; j < period; j++) {
        variance += Math.pow(data[i - j].close - ma, 2)
      }
      const sd = Math.sqrt(variance / period)

      middle.push({ time: data[i].time, value: ma })
      upper.push({ time: data[i].time, value: ma + stdDev * sd })
      lower.push({ time: data[i].time, value: ma - stdDev * sd })
    }

    return { middle, upper, lower }
  }

  // 计算 KDJ
  const calculateKDJ = (data, period = 9, k_period = 3, d_period = 3) => {
    const k_values = []
    const d_values = []
    const j_values = []
    let k = 50
    let d = 50

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        k_values.push({ time: data[i].time, value: null })
        d_values.push({ time: data[i].time, value: null })
        j_values.push({ time: data[i].time, value: null })
        continue
      }

      // 找到period天内的最高价和最低价
      let highestHigh = -Infinity
      let lowestLow = Infinity
      for (let j = 0; j < period; j++) {
        const idx = i - j
        if (data[idx].high > highestHigh) highestHigh = data[idx].high
        if (data[idx].low < lowestLow) lowestLow = data[idx].low
      }

      // 计算RSV
      const rsv = highestHigh === lowestLow ? 0 : ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100

      // 计算K值
      k = (k * (k_period - 1) + rsv) / k_period

      // 计算D值
      d = (d * (d_period - 1) + k) / d_period

      // 计算J值
      const j = 3 * k - 2 * d

      k_values.push({ time: data[i].time, value: k })
      d_values.push({ time: data[i].time, value: d })
      j_values.push({ time: data[i].time, value: j })
    }

    return { k: k_values, d: d_values, j: j_values }
  }

  // 计算 MACD
  const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    const emaFast = calculateEMA(data, fastPeriod)
    const emaSlow = calculateEMA(data, slowPeriod)
    const dif = []
    const dea = []
    const macd = []

    // 计算DIF
    for (let i = 0; i < data.length; i++) {
      if (emaFast[i].value === null || emaSlow[i].value === null) {
        dif.push({ time: data[i].time, value: null })
      } else {
        dif.push({ time: data[i].time, value: emaFast[i].value - emaSlow[i].value })
      }
    }

    // 计算DEA (DIF的EMA)
    const multiplier = 2 / (signalPeriod + 1)
    let deaValue = 0
    for (let i = 0; i < dif.length; i++) {
      if (dif[i].value === null) {
        dea.push({ time: data[i].time, value: null })
        macd.push({ time: data[i].time, value: null, color: 'transparent' })
        continue
      }

      if (i < slowPeriod + signalPeriod - 2) {
        dea.push({ time: data[i].time, value: null })
        macd.push({ time: data[i].time, value: null, color: 'transparent' })
        continue
      }

      if (i === slowPeriod + signalPeriod - 2) {
        let sum = 0
        let count = 0
        for (let j = 0; j <= i; j++) {
          if (dif[j].value !== null) {
            sum += dif[j].value
            count++
          }
        }
        deaValue = sum / count
      } else {
        deaValue = (dif[i].value - deaValue) * multiplier + deaValue
      }

      dea.push({ time: data[i].time, value: deaValue })

      // 计算MACD柱
      const macdValue = (dif[i].value - deaValue) * 2
      macd.push({
        time: data[i].time,
        value: macdValue,
        color: macdValue >= 0 ? 'rgba(239, 35, 42, 0.5)' : 'rgba(20, 177, 67, 0.5)',
      })
    }

    return { dif, dea, macd }
  }

  // 计算 RSI
  const calculateRSI = (data, period = 14) => {
    const rsi = []

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        rsi.push({ time: data[i].time, value: null })
        continue
      }

      let gains = 0
      let losses = 0

      for (let j = 1; j <= period; j++) {
        const change = data[i - j + 1].close - data[i - j].close
        if (change > 0) {
          gains += change
        } else {
          losses -= change
        }
      }

      const avgGain = gains / period
      const avgLoss = losses / period

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      const rsiValue = 100 - (100 / (1 + rs))

      rsi.push({ time: data[i].time, value: rsiValue })
    }

    return rsi
  }

  // 计算 WR (威廉指标)
  const calculateWR = (data, period = 14) => {
    const wr = []

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        wr.push({ time: data[i].time, value: null })
        continue
      }

      let highestHigh = -Infinity
      let lowestLow = Infinity

      for (let j = 0; j < period; j++) {
        const idx = i - j
        if (data[idx].high > highestHigh) highestHigh = data[idx].high
        if (data[idx].low < lowestLow) lowestLow = data[idx].low
      }

      const wrValue = highestHigh === lowestLow ? 0 : ((highestHigh - data[i].close) / (highestHigh - lowestLow)) * -100

      wr.push({ time: data[i].time, value: wrValue })
    }

    return wr
  }

  // 计算 DMI
  const calculateDMI = (data, period = 14) => {
    const pdi = []
    const mdi = []
    const adx = []
    let prevTR = 0
    let prevPlusDM = 0
    let prevMinusDM = 0
    let prevDX = 0

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        pdi.push({ time: data[i].time, value: null })
        mdi.push({ time: data[i].time, value: null })
        adx.push({ time: data[i].time, value: null })
        continue
      }

      const high = data[i].high
      const low = data[i].low
      const prevHigh = data[i - 1].high
      const prevLow = data[i - 1].low
      const prevClose = data[i - 1].close

      const plusDM = high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0
      const minusDM = prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))

      if (i < period) {
        prevTR += tr
        prevPlusDM += plusDM
        prevMinusDM += minusDM
        pdi.push({ time: data[i].time, value: null })
        mdi.push({ time: data[i].time, value: null })
        adx.push({ time: data[i].time, value: null })
        continue
      }

      if (i === period) {
        prevTR = prevTR
        prevPlusDM = prevPlusDM
        prevMinusDM = prevMinusDM
      } else {
        prevTR = prevTR - prevTR / period + tr
        prevPlusDM = prevPlusDM - prevPlusDM / period + plusDM
        prevMinusDM = prevMinusDM - prevMinusDM / period + minusDM
      }

      const pdiValue = prevTR === 0 ? 0 : (prevPlusDM / prevTR) * 100
      const mdiValue = prevTR === 0 ? 0 : (prevMinusDM / prevTR) * 100

      pdi.push({ time: data[i].time, value: pdiValue })
      mdi.push({ time: data[i].time, value: mdiValue })

      const dx = pdiValue + mdiValue === 0 ? 0 : (Math.abs(pdiValue - mdiValue) / (pdiValue + mdiValue)) * 100

      if (i < period * 2 - 1) {
        prevDX += dx
        adx.push({ time: data[i].time, value: null })
      } else if (i === period * 2 - 1) {
        const adxValue = prevDX / period
        prevDX = adxValue
        adx.push({ time: data[i].time, value: adxValue })
      } else {
        const adxValue = (prevDX * (period - 1) + dx) / period
        prevDX = adxValue
        adx.push({ time: data[i].time, value: adxValue })
      }
    }

    return { pdi, mdi, adx }
  }

  // 计算 CCI
  const calculateCCI = (data, period = 14) => {
    const cci = []

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        cci.push({ time: data[i].time, value: null })
        continue
      }

      // 计算典型价格TP
      const tpArray = []
      for (let j = 0; j < period; j++) {
        const idx = i - j
        const tp = (data[idx].high + data[idx].low + data[idx].close) / 3
        tpArray.push(tp)
      }

      // 计算MA
      const ma = tpArray.reduce((a, b) => a + b, 0) / period

      // 计算平均绝对偏差
      const md = tpArray.reduce((sum, tp) => sum + Math.abs(tp - ma), 0) / period

      // 计算CCI
      const currentTP = (data[i].high + data[i].low + data[i].close) / 3
      const cciValue = md === 0 ? 0 : (currentTP - ma) / (0.015 * md)

      cci.push({ time: data[i].time, value: cciValue })
    }

    return cci
  }

  // 计算 BIAS (乖离率)
  const calculateBIAS = (data, period = 6) => {
    const bias = []

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        bias.push({ time: data[i].time, value: null })
        continue
      }

      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close
      }
      const ma = sum / period

      const biasValue = ma === 0 ? 0 : ((data[i].close - ma) / ma) * 100

      bias.push({ time: data[i].time, value: biasValue })
    }

    return bias
  }

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
    } catch (error) {
      console.error('更新最高最低价标记失败:', error)
    }
  }

  // 更新数据
  useEffect(() => {
    console.log('📈 更新数据 useEffect 触发', {
      isChartReady,
      hasCandlestickSeries: !!candlestickSeriesRef.current,
      dataLength: data?.length
    })

    if (!isChartReady || !candlestickSeriesRef.current) {
      console.log('⚠️ 图表未准备好或系列未创建')
      return
    }

    // 如果没有数据，也要通知父组件图表已经准备好（避免一直加载）
    if (!data || data.length === 0) {
      console.log('⚠️ 没有数据，通知图表准备完成')
      setTimeout(() => {
        onChartReady?.()
      }, 150)
      return
    }

    try {
      console.log('✅ 开始设置K线数据，数据条数:', data.length)

      // 设置K线数据
      const candlestickData = data.map(item => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))

      candlestickSeriesRef.current.setData(candlestickData)
      console.log('✅ K线数据设置成功')

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

      // 通知父组件图表渲染完成
      // 延迟一小段时间确保所有渲染都完成
      setTimeout(() => {
        console.log('✅ 通知父组件图表渲染完成')
        onChartReady?.()
      }, 150)
    } catch (error) {
      console.error('❌ Failed to set chart data:', error)
      // 即使出错也要通知完成，避免一直加载
      onChartReady?.()
    }
  }, [data, isChartReady, onChartReady])

  // 更新成交量数据（现在在第一张图中）
  useEffect(() => {
    if (!isChartReady || !volumeSeriesRef.current || !data || data.length === 0) {
      return
    }

    try {
      // 设置成交量数据（根据涨跌设置颜色）
      const volumeData = data.map(item => ({
        time: item.time,
        value: item.volume || 0,
        color: item.close >= item.open ? 'rgba(239, 35, 42, 0.5)' : 'rgba(20, 177, 67, 0.5)',
      }))

      volumeSeriesRef.current.setData(volumeData)
    } catch (error) {
      console.error('Failed to set volume data:', error)
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

    // 优先使用API返回的字段，如果没有则计算
    let previousClose = selectedData.preClose
    let changePercent = selectedData.pctChange
    let changeAmount = selectedData.changeAmount

    // 如果API没有返回这些字段，使用本地计算
    if (previousClose === null || previousClose === undefined) {
      previousClose = getPreviousClose(currentIndex)
    }
    if (changePercent === null || changePercent === undefined || changeAmount === null || changeAmount === undefined) {
      const calculated = calculateChange(selectedData.close, previousClose)
      changePercent = calculated.changePercent
      changeAmount = calculated.changeAmount
    }

    return {
      ...selectedData,
      changePercent,
      changeAmount,
      previousClose, // 上一个交易日的收盘价
    }
  }

  const displayData = getDisplayData()

  // 获取下方指标的当前数据
  const getLowerIndicatorData = () => {
    if (!selectedData || !lowerIndicator) return null

    const indicator = lowerIndicator
    const currentIndex = data.findIndex(d => d.time === selectedData.time)
    if (currentIndex < 0) return null

    let result = { indicator }

    if (indicator === 'KDJ') {
      const kdjData = calculateKDJ(data, 9, 3, 3)
      if (currentIndex < kdjData.k.length) {
        result.K = kdjData.k[currentIndex].value
        result.D = kdjData.d[currentIndex].value
        result.J = kdjData.j[currentIndex].value
      }
    } else if (indicator === 'MACD') {
      const macdData = calculateMACD(data, 12, 26, 9)
      if (currentIndex < macdData.dif.length) {
        result.DIF = macdData.dif[currentIndex].value
        result.DEA = macdData.dea[currentIndex].value
        result.MACD = macdData.macd[currentIndex].value
      }
    } else if (indicator === 'RSI') {
      const rsiData = calculateRSI(data, 14)
      if (currentIndex < rsiData.length) {
        result.RSI = rsiData[currentIndex].value
      }
    } else if (indicator === 'WR') {
      const wrData = calculateWR(data, 14)
      if (currentIndex < wrData.length) {
        result.WR = wrData[currentIndex].value
      }
    } else if (indicator === 'DMI') {
      const dmiData = calculateDMI(data, 14)
      if (currentIndex < dmiData.pdi.length) {
        result.PDI = dmiData.pdi[currentIndex].value
        result.MDI = dmiData.mdi[currentIndex].value
        result.ADX = dmiData.adx[currentIndex].value
      }
    } else if (indicator === 'CCI') {
      const cciData = calculateCCI(data, 14)
      if (currentIndex < cciData.length) {
        result.CCI = cciData[currentIndex].value
      }
    } else if (indicator === 'BIAS') {
      const biasData = calculateBIAS(data, 6)
      if (currentIndex < biasData.length) {
        result.BIAS = biasData[currentIndex].value
      }
    }

    return result
  }

  const lowerIndicatorData = getLowerIndicatorData()

  // 更新技术指标
  useEffect(() => {
    if (!isChartReady || !chartRef.current || !data || data.length === 0) {
      return
    }

    // 清除所有现有的指标线
    Object.values(indicatorSeriesRefs.current).forEach(series => {
      if (series) {
        chartRef.current.removeSeries(series)
      }
    })
    indicatorSeriesRefs.current = {}

    // 根据选中的指标添加新的线
    indicators.forEach(indicator => {
      if (indicator === 'MA5') {
        const ma5Data = calculateMA(data, 5)
        const series = chartRef.current.addLineSeries({
          color: '#FF6D00',
          lineWidth: 1,
          title: 'MA5',
        })
        series.setData(ma5Data.filter(d => d.value !== null))
        indicatorSeriesRefs.current['MA5'] = series
      } else if (indicator === 'MA10') {
        const ma10Data = calculateMA(data, 10)
        const series = chartRef.current.addLineSeries({
          color: '#00BCD4',
          lineWidth: 1,
          title: 'MA10',
        })
        series.setData(ma10Data.filter(d => d.value !== null))
        indicatorSeriesRefs.current['MA10'] = series
      } else if (indicator === 'MA20') {
        const ma20Data = calculateMA(data, 20)
        const series = chartRef.current.addLineSeries({
          color: '#9C27B0',
          lineWidth: 1,
          title: 'MA20',
        })
        series.setData(ma20Data.filter(d => d.value !== null))
        indicatorSeriesRefs.current['MA20'] = series
      } else if (indicator === 'EMA12') {
        const ema12Data = calculateEMA(data, 12)
        const series = chartRef.current.addLineSeries({
          color: '#4CAF50',
          lineWidth: 1,
          title: 'EMA12',
        })
        series.setData(ema12Data.filter(d => d.value !== null))
        indicatorSeriesRefs.current['EMA12'] = series
      } else if (indicator === 'EMA26') {
        const ema26Data = calculateEMA(data, 26)
        const series = chartRef.current.addLineSeries({
          color: '#FF5722',
          lineWidth: 1,
          title: 'EMA26',
        })
        series.setData(ema26Data.filter(d => d.value !== null))
        indicatorSeriesRefs.current['EMA26'] = series
      } else if (indicator === 'BOLL') {
        const bollData = calculateBOLL(data, 20, 2)

        // 上轨
        const upperSeries = chartRef.current.addLineSeries({
          color: '#2196F3',
          lineWidth: 1,
          lineStyle: 2, // 虚线
          title: 'BOLL上',
        })
        upperSeries.setData(bollData.upper.filter(d => d.value !== null))
        indicatorSeriesRefs.current['BOLL_upper'] = upperSeries

        // 中轨
        const middleSeries = chartRef.current.addLineSeries({
          color: '#FFC107',
          lineWidth: 1,
          title: 'BOLL中',
        })
        middleSeries.setData(bollData.middle.filter(d => d.value !== null))
        indicatorSeriesRefs.current['BOLL_middle'] = middleSeries

        // 下轨
        const lowerSeries = chartRef.current.addLineSeries({
          color: '#2196F3',
          lineWidth: 1,
          lineStyle: 2, // 虚线
          title: 'BOLL下',
        })
        lowerSeries.setData(bollData.lower.filter(d => d.value !== null))
        indicatorSeriesRefs.current['BOLL_lower'] = lowerSeries
      }
    })
  }, [indicators, data, isChartReady])

  // 更新下方技术指标
  useEffect(() => {
    if (!isChartReady || !chartRef.current || !data || data.length === 0) {
      return
    }

    // 清除所有现有的下方指标线
    Object.values(lowerIndicatorSeriesRefs.current).forEach(series => {
      if (series) {
        chartRef.current.removeSeries(series)
      }
    })
    lowerIndicatorSeriesRefs.current = {}

    // 如果没有选择任何指标，直接返回
    if (!lowerIndicator) {
      return
    }

    // 显示选中的指标
    const indicator = lowerIndicator

    if (indicator === 'KDJ') {
      const kdjData = calculateKDJ(data, 9, 3, 3)

      const kSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#2196F3',
        lineWidth: 2,
        title: 'K',
        lastValueVisible: false,
        priceLineVisible: false,
      })
      kSeries.setData(kdjData.k.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['KDJ_K'] = kSeries

      const dSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#FFC107',
        lineWidth: 2,
        title: 'D',
        lastValueVisible: false,
        priceLineVisible: false,
      })
      dSeries.setData(kdjData.d.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['KDJ_D'] = dSeries

      const jSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#9C27B0',
        lineWidth: 2,
        title: 'J',
        lastValueVisible: false,
        priceLineVisible: false,
      })
      jSeries.setData(kdjData.j.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['KDJ_J'] = jSeries
    } else if (indicator === 'MACD') {
      const macdData = calculateMACD(data, 12, 26, 9)

      // MACD柱状图
      const macdSeries = chartRef.current.addHistogramSeries({
        priceScaleId: 'lower',
        priceFormat: {
          type: 'price',
          precision: 4,
        },
      })
      macdSeries.setData(macdData.macd.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['MACD'] = macdSeries

      // DIF线
      const difSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#2196F3',
        lineWidth: 2,
        title: 'DIF',
      })
      difSeries.setData(macdData.dif.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['MACD_DIF'] = difSeries

      // DEA线
      const deaSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#FFC107',
        lineWidth: 2,
        title: 'DEA',
      })
      deaSeries.setData(macdData.dea.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['MACD_DEA'] = deaSeries
    } else if (indicator === 'RSI') {
      const rsiData = calculateRSI(data, 14)

      const rsiSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#2196F3',
        lineWidth: 2,
        title: 'RSI',
      })
      rsiSeries.setData(rsiData.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['RSI'] = rsiSeries
    } else if (indicator === 'WR') {
      const wrData = calculateWR(data, 14)

      const wrSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#2196F3',
        lineWidth: 2,
        title: 'WR',
      })
      wrSeries.setData(wrData.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['WR'] = wrSeries
    } else if (indicator === 'DMI') {
      const dmiData = calculateDMI(data, 14)

      const pdiSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#ef232a',
        lineWidth: 2,
        title: 'PDI',
      })
      pdiSeries.setData(dmiData.pdi.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['DMI_PDI'] = pdiSeries

      const mdiSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#14b143',
        lineWidth: 2,
        title: 'MDI',
      })
      mdiSeries.setData(dmiData.mdi.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['DMI_MDI'] = mdiSeries

      const adxSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#2196F3',
        lineWidth: 2,
        title: 'ADX',
      })
      adxSeries.setData(dmiData.adx.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['DMI_ADX'] = adxSeries
    } else if (indicator === 'CCI') {
      const cciData = calculateCCI(data, 14)

      const cciSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#2196F3',
        lineWidth: 2,
        title: 'CCI',
      })
      cciSeries.setData(cciData.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['CCI'] = cciSeries
    } else if (indicator === 'BIAS') {
      const biasData = calculateBIAS(data, 6)

      const biasSeries = chartRef.current.addLineSeries({
        priceScaleId: 'lower',
        color: '#2196F3',
        lineWidth: 2,
        title: 'BIAS',
      })
      biasSeries.setData(biasData.filter(d => d.value !== null))
      lowerIndicatorSeriesRefs.current['BIAS'] = biasSeries
    }
  }, [lowerIndicator, data, isChartReady])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 加载遮罩层 */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(28, 28, 28, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.25) 40%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.25) 60%, rgba(255, 255, 255, 0.25) 100%)',
            backgroundSize: '200% 100%',
            backgroundPosition: '-100% 0',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 1.8s ease-in-out infinite',
          }}>
            加载中...
          </div>
        </div>
      )}

      {/* 标题和控制器行 */}
      {title && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 200px',
            gap: '40px',
            alignItems: 'center',
            marginBottom: '20px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* 左侧：标题和控制器组 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            {/* 第一行：标题和数据展示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexShrink: 0,
                }}
              >
                <span>{title}</span>
                {/* 股票信息图标 */}
                {stockInfo && (
                  <ConfigProvider
                    theme={{
                      components: {
                        Popover: {
                          colorBgElevated: 'rgb(30, 30, 30)',
                          colorText: 'rgba(255, 255, 255, 0.85)',
                          fontSize: 12,
                        },
                      },
                    }}
                  >
                  <Popover
                      overlayInnerStyle={{
                        backgroundColor: '#1f1f1f',
                        color: '#ffffff',
                        border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                      }}
                      content={
                        <div style={{ minWidth: '450px', maxWidth: '500px' }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#ffffff',
                              marginBottom: '12px',
                              paddingBottom: '8px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                            }}
                          >
                            基本信息
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              fontSize: '11px',
                            }}
                          >
                            {/* 全称信息 */}
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                paddingBottom: '8px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>全称</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', wordBreak: 'break-all', flex: 1 }}>{stockInfo.fullName || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>英文</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.85)', wordBreak: 'break-all', fontSize: '10px', flex: 1 }}>{stockInfo.enName || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>拼音</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.cnSpell || '--'}</span>
                              </div>
                            </div>

                            {/* 基础信息网格 */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '8px 16px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>交易所</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.exchange || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>市场</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.market || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>货币</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.currType || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>上市</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.listingDate || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>行业</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.industry || '--'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>状态</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>
                                  {stockInfo.status ? (stockInfo.status === 'L' ? '上市' : stockInfo.status === 'D' ? '退市' : stockInfo.status === 'P' ? '暂停' : stockInfo.status) : '--'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>港通</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>
                                  {stockInfo.isHs ? (stockInfo.isHs === 'N' ? '否' : stockInfo.isHs === 'H' ? '沪股通' : stockInfo.isHs === 'S' ? '深股通' : stockInfo.isHs) : '--'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>退市</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.delistDate || '--'}</span>
                              </div>
                            </div>

                            {/* 实控人信息 */}
                            {(stockInfo.actName || stockInfo.actEntType) && (
                              <div
                                style={{
                                  paddingTop: '8px',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}
                              >
                                {stockInfo.actName && (
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>实控人</span>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.actName}</span>
                                  </div>
                                )}
                                {stockInfo.actEntType && (
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '42px' }}>性质</span>
                                    <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{stockInfo.actEntType}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 公司详情（第二块）*/}
                          <div
                            style={{
                              paddingTop: '12px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                              marginTop: '12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                fontSize: '11px',
                              }}
                            >
                              {/* 公司详情网格 */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(2, 1fr)',
                                  gap: '8px 16px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>COMID</span>
                                  {companyDetail?.comId ? (
                                    <span style={{ color: 'rgba(24, 144, 255, 0.9)', fontSize: '10px', flex: 1, wordBreak: 'break-all' }}>
                                      <a
                                        href={`https://www.cods.org.cn`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'inherit', textDecoration: 'underline' }}
                                      >
                                        {companyDetail.comId}
                                      </a>
                                    </span>
                                  ) : (
                                    <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>--</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>法人代表</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{companyDetail?.chairman || '--'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>总经理</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{companyDetail?.manager || '--'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>董秘</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{companyDetail?.secretary || '--'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>员工人数</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{companyDetail?.employees ? `${companyDetail.employees}人` : '--'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>注册日期</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{companyDetail?.setupDate || '--'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>注册资本</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>{companyDetail?.regCapital ? `${companyDetail.regCapital}万元` : '--'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>所在省份</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                    <Tooltip title={companyDetail?.province && companyDetail.province !== '--' ? companyDetail.province : null}>
                                      <span
                                        style={{
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          minWidth: 0,
                                        }}
                                      >
                                        {companyDetail?.province || '--'}
                                      </span>
                                    </Tooltip>
                                    {companyDetail?.province && companyDetail.province !== '--' && (
                                      <a
                                        href={`https://www.amap.com/search?query=${encodeURIComponent(companyDetail.province)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'rgba(24, 144, 255, 0.8)', fontSize: '10px', lineHeight: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                      >
                                        <EnvironmentOutlined />
                                      </a>
                                    )}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>所在城市</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                    <Tooltip title={companyDetail?.city && companyDetail.city !== '--' ? companyDetail.city : null}>
                                      <span
                                        style={{
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          minWidth: 0,
                                        }}
                                      >
                                        {companyDetail?.city || '--'}
                                      </span>
                                    </Tooltip>
                                    {companyDetail?.city && companyDetail.city !== '--' && (
                                      <a
                                        href={`https://www.amap.com/search?query=${encodeURIComponent(companyDetail.city)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'rgba(24, 144, 255, 0.8)', fontSize: '10px', lineHeight: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                      >
                                        <EnvironmentOutlined />
                                      </a>
                                    )}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>办公室</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                    <Tooltip title={companyDetail?.office && companyDetail.office !== '--' ? companyDetail.office : null}>
                                      <span
                                        style={{
                                          whiteSpace: 'nowrap',
                                          minWidth: 0,
                                        }}
                                      >
                                        {companyDetail?.office
                                          ? (companyDetail.office.length > 12
                                              ? `${companyDetail.office.substring(0, 12)}...`
                                              : companyDetail.office)
                                          : '--'}
                                      </span>
                                    </Tooltip>
                                    {companyDetail?.office && companyDetail.office !== '--' && (
                                      <a
                                        href={`https://www.amap.com/search?query=${encodeURIComponent(companyDetail.office)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'rgba(24, 144, 255, 0.8)', fontSize: '10px', lineHeight: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                      >
                                        <EnvironmentOutlined />
                                      </a>
                                    )}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>公司主页</span>
                                  {companyDetail?.website ? (
                                    <Tooltip title={companyDetail.website}>
                                      <span
                                        style={{
                                          color: 'rgba(24, 144, 255, 0.9)',
                                          fontSize: '10px',
                                          flex: 1,
                                          whiteSpace: 'nowrap',
                                          minWidth: 0,
                                        }}
                                      >
                                        <a
                                          href={companyDetail.website.startsWith('http') ? companyDetail.website : `https://${companyDetail.website}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: 'inherit', textDecoration: 'underline' }}
                                        >
                                          {companyDetail.website.length > 22
                                            ? `${companyDetail.website.substring(0, 22)}...`
                                            : companyDetail.website}
                                        </a>
                                      </span>
                                    </Tooltip>
                                  ) : (
                                    <span style={{ color: 'rgba(255, 255, 255, 0.95)', flex: 1 }}>--</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap', minWidth: '56px' }}>电子邮件</span>
                                  {companyDetail?.email ? (
                                    <span style={{ color: 'rgba(24, 144, 255, 0.9)', fontSize: '10px', flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                      <Tooltip title={companyDetail.email}>
                                        <span
                                          style={{
                                            whiteSpace: 'nowrap',
                                            minWidth: 0,
                                          }}
                                        >
                                          <a
                                            href={`mailto:${companyDetail.email}`}
                                            style={{ color: 'inherit', textDecoration: 'underline' }}
                                          >
                                            {companyDetail.email.length > 22
                                              ? `${companyDetail.email.substring(0, 22)}...`
                                              : companyDetail.email}
                                          </a>
                                        </span>
                                      </Tooltip>
                                      <CopyOutlined
                                        style={{ color: 'rgba(24, 144, 255, 0.8)', fontSize: '10px', cursor: 'pointer', flexShrink: 0 }}
                                        onClick={() => {
                                          navigator.clipboard.writeText(companyDetail.email)
                                          message.success('邮箱地址已复制')
                                        }}
                                      />
                                    </span>
                                  ) : (
                                    <span style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '10px', flex: 1 }}>--</span>
                                  )}
                                </div>
                              </div>

                              {/* 公司介绍 */}
                              <div
                                style={{
                                  paddingTop: '8px',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: '500' }}>公司介绍</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.7', fontSize: '10px' }}>
                                    {companyDetail?.introduction ? (
                                      companyDetail.introduction.length > 200
                                        ? `${companyDetail.introduction.substring(0, 200)}...`
                                        : companyDetail.introduction
                                    ) : '--'}
                                  </span>
                                </div>
                              </div>

                              {/* 主要业务及产品 */}
                              <div
                                style={{
                                  paddingTop: '8px',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: '500' }}>主要业务及产品</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.7', fontSize: '10px' }}>
                                    {companyDetail?.mainBusiness ? (
                                      companyDetail.mainBusiness.length > 200
                                        ? `${companyDetail.mainBusiness.substring(0, 200)}...`
                                        : companyDetail.mainBusiness
                                    ) : '--'}
                                  </span>
                                </div>
                              </div>

                              {/* 经营范围 */}
                              <div
                                style={{
                                  paddingTop: '8px',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: '500' }}>经营范围</span>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.7', fontSize: '10px' }}>
                                    {companyDetail?.businessScope ? (
                                      companyDetail.businessScope.length > 200
                                        ? `${companyDetail.businessScope.substring(0, 200)}...`
                                        : companyDetail.businessScope
                                    ) : '--'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                      title={null}
                      trigger="hover"
                      placement="bottomLeft"
                      overlayStyle={{ maxWidth: '480px' }}
                    >
                      <InfoCircleOutlined
                        style={{
                          fontSize: '16px',
                          color: 'rgba(255, 255, 255, 0.4)',
                          cursor: 'pointer',
                          transition: 'color 0.3s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'rgba(24, 144, 255, 0.85)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
                        }}
                      />
                    </Popover>
                  </ConfigProvider>
                )}
              </div>

              {/* 横向展示K线数据 */}
              {displayData && (
                <div
                  className="stock-data-display"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    flex: 1,
                    minWidth: '900px',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: '4px'
                  }}
                >
                  {/* 日期 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600', fontSize: '13px' }}>{displayData.time}</span>
                  </div>

                  {/* 开盘 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>开</span>
                    <span style={{
                      color: displayData.previousClose
                        ? displayData.open > displayData.previousClose ? '#ef232a'
                        : displayData.open < displayData.previousClose ? '#14b143'
                        : '#ffffff'
                        : '#ffffff',
                      fontWeight: '500',
                      fontSize: '12px'
                    }}>{displayData.open.toFixed(2)}</span>
                  </div>

                  {/* 收盘 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>收</span>
                    <span style={{
                      color: displayData.previousClose
                        ? displayData.close > displayData.previousClose ? '#ef232a'
                        : displayData.close < displayData.previousClose ? '#14b143'
                        : '#ffffff'
                        : '#ffffff',
                      fontWeight: '500',
                      fontSize: '12px'
                    }}>{displayData.close.toFixed(2)}</span>
                  </div>

                  {/* 最高 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>高</span>
                    <span style={{
                      color: displayData.previousClose
                        ? displayData.high > displayData.previousClose ? '#ef232a'
                        : displayData.high < displayData.previousClose ? '#14b143'
                        : '#ffffff'
                        : '#ffffff',
                      fontWeight: '500',
                      fontSize: '12px'
                    }}>{displayData.high.toFixed(2)}</span>
                  </div>

                  {/* 最低 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>低</span>
                    <span style={{
                      color: displayData.previousClose
                        ? displayData.low > displayData.previousClose ? '#ef232a'
                        : displayData.low < displayData.previousClose ? '#14b143'
                        : '#ffffff'
                        : '#ffffff',
                      fontWeight: '500',
                      fontSize: '12px'
                    }}>{displayData.low.toFixed(2)}</span>
                  </div>

                  {/* 涨幅 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>涨幅</span>
                    <span style={{
                      color: displayData.changePercent > 0 ? '#ef232a'
                        : displayData.changePercent < 0 ? '#14b143'
                        : '#666',
                      fontWeight: '600',
                      fontSize: '12px'
                    }}>
                      {displayData.changePercent > 0 ? '+' : ''}{displayData.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* 涨幅金额 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>涨跌</span>
                    <span style={{
                      color: displayData.changeAmount > 0 ? '#ef232a'
                        : displayData.changeAmount < 0 ? '#14b143'
                        : '#666',
                      fontWeight: '500',
                      fontSize: '12px'
                    }}>
                      {displayData.changeAmount > 0 ? '+' : ''}{displayData.changeAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* 成交量 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>量</span>
                    <span style={{
                      color: displayData.close > displayData.open ? '#ef232a'
                        : displayData.close < displayData.open ? '#14b143'
                        : '#ffffff',
                      fontWeight: '500',
                      fontSize: '12px'
                    }}>{(displayData.volume / 10000).toFixed(2)}万手</span>
                  </div>

                  {/* 成交额 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '10px' }}>额</span>
                    <span style={{
                      color: displayData.close > displayData.open ? '#ef232a'
                        : displayData.close < displayData.open ? '#14b143'
                        : '#ffffff',
                      fontWeight: '500',
                      fontSize: '12px'
                    }}>{(displayData.volume * displayData.close / 100000000).toFixed(2)}亿</span>
                  </div>

                  {/* 技术指标数据 */}
                  {lowerIndicator && (() => {
                    const dataIndex = data.findIndex(d => d.time === displayData.time)
                    if (dataIndex === -1) return null

                    if (lowerIndicator === 'KDJ') {
                      const kdjData = calculateKDJ(data, 9, 3, 3)
                      const kVal = kdjData.k[dataIndex]?.value
                      const dVal = kdjData.d[dataIndex]?.value
                      const jVal = kdjData.j[dataIndex]?.value
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#2196F3', fontSize: '10px', fontWeight: '500' }}>K:{kVal ? kVal.toFixed(2) : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#FF9800', fontSize: '10px', fontWeight: '500' }}>D:{dVal ? dVal.toFixed(2) : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#9C27B0', fontSize: '10px', fontWeight: '500' }}>J:{jVal ? jVal.toFixed(2) : '--'}</span>
                          </div>
                        </>
                      )
                    } else if (lowerIndicator === 'MACD') {
                      const macdData = calculateMACD(data, 12, 26, 9)
                      const difVal = macdData.dif[dataIndex]?.value
                      const deaVal = macdData.dea[dataIndex]?.value
                      const macdVal = macdData.macd[dataIndex]?.value
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#2196F3', fontSize: '10px', fontWeight: '500' }}>DIF:{difVal !== null && difVal !== undefined ? difVal.toFixed(4) : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#FF9800', fontSize: '10px', fontWeight: '500' }}>DEA:{deaVal !== null && deaVal !== undefined ? deaVal.toFixed(4) : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: macdVal !== null && macdVal !== undefined && macdVal > 0 ? '#ef232a' : '#14b143', fontSize: '10px', fontWeight: '500' }}>MACD:{macdVal !== null && macdVal !== undefined ? macdVal.toFixed(4) : '--'}</span>
                          </div>
                        </>
                      )
                    } else if (lowerIndicator === 'RSI') {
                      const rsiData = calculateRSI(data, 14)
                      const rsiVal = rsiData[dataIndex]?.value
                      return (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                          <span style={{ color: '#2196F3', fontSize: '10px', fontWeight: '500' }}>RSI:{rsiVal ? rsiVal.toFixed(2) : '--'}</span>
                        </div>
                      )
                    } else if (lowerIndicator === 'WR') {
                      const wrData = calculateWR(data, 14)
                      const wrVal = wrData[dataIndex]?.value
                      return (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                          <span style={{ color: '#2196F3', fontSize: '10px', fontWeight: '500' }}>WR:{wrVal ? wrVal.toFixed(2) : '--'}</span>
                        </div>
                      )
                    } else if (lowerIndicator === 'DMI') {
                      const dmiData = calculateDMI(data, 14)
                      const pdiVal = dmiData.pdi[dataIndex]?.value
                      const mdiVal = dmiData.mdi[dataIndex]?.value
                      const adxVal = dmiData.adx[dataIndex]?.value
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#2196F3', fontSize: '10px', fontWeight: '500' }}>PDI:{pdiVal ? pdiVal.toFixed(2) : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#FF9800', fontSize: '10px', fontWeight: '500' }}>MDI:{mdiVal ? mdiVal.toFixed(2) : '--'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                            <span style={{ color: '#9C27B0', fontSize: '10px', fontWeight: '500' }}>ADX:{adxVal ? adxVal.toFixed(2) : '--'}</span>
                          </div>
                        </>
                      )
                    } else if (lowerIndicator === 'CCI') {
                      const cciData = calculateCCI(data, 14)
                      const cciVal = cciData[dataIndex]?.value
                      return (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                          <span style={{ color: '#2196F3', fontSize: '10px', fontWeight: '500' }}>CCI:{cciVal ? cciVal.toFixed(2) : '--'}</span>
                        </div>
                      )
                    } else if (lowerIndicator === 'BIAS') {
                      const biasData = calculateBIAS(data, 6)
                      const biasVal = biasData[dataIndex]?.value
                      return (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                          <span style={{ color: '#2196F3', fontSize: '10px', fontWeight: '500' }}>BIAS:{biasVal ? biasVal.toFixed(2) : '--'}%</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </div>

            {/* 第二行：控制器组（靠右） */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end' }}>
            {/* 时间周期选择器 */}
            <ConfigProvider
              theme={{
                components: {
                  Radio: {
                    colorPrimary: '#1890ff',
                    colorPrimaryHover: '#40a9ff',
                    fontSize: 12,
                  },
                },
              }}
            >
              <Radio.Group
                value={period}
                onChange={(e) => onPeriodChange && onPeriodChange(e.target.value)}
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <Radio.Button
                  value="minute"
                  disabled
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    color: 'rgba(255, 255, 255, 0.3)',
                    cursor: 'not-allowed',
                  }}
                >
                  分时
                </Radio.Button>
                <Radio.Button
                  value="daily"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: period === 'daily' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: period === 'daily' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: period === 'daily' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  日线
                </Radio.Button>
                <Radio.Button
                  value="weekly"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: period === 'weekly' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: period === 'weekly' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: period === 'weekly' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  周线
                </Radio.Button>
                <Radio.Button
                  value="monthly"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: period === 'monthly' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: period === 'monthly' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: period === 'monthly' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  月线
                </Radio.Button>
                <Radio.Button
                  value="quarterly"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: period === 'quarterly' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: period === 'quarterly' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: period === 'quarterly' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  季线
                </Radio.Button>
                <Radio.Button
                  value="yearly"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: period === 'yearly' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: period === 'yearly' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: period === 'yearly' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  年线
                </Radio.Button>
              </Radio.Group>
            </ConfigProvider>

            {/* 复权类型选择器 */}
            <ConfigProvider
              theme={{
                components: {
                  Radio: {
                    colorPrimary: '#1890ff',
                    colorPrimaryHover: '#40a9ff',
                    fontSize: 12,
                  },
                },
              }}
            >
              <Radio.Group
                value={adjustType}
                onChange={(e) => {
                  const newAdjustType = e.target.value
                  // 将 adjustType ('hfq','qfq','none') 转换为 adjustFlag (1,2,3)
                  const newAdjustFlag = newAdjustType === 'hfq' ? 1 : newAdjustType === 'qfq' ? 2 : 3
                  onAdjustFlagChange?.(newAdjustFlag)
                }}
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <Radio.Button
                  value="none"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: adjustType === 'none' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: adjustType === 'none' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: adjustType === 'none' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    不复权
                    <Popover
                      overlayInnerStyle={{
                        backgroundColor: '#1f1f1f',
                        color: '#ffffff',
                        border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                      }}
                      content={
                        <div className="indicator-popover-wrapper">
                          <button
                            className="indicator-learn-more"
                            onClick={() => onOpenKnowledge?.(indicatorDocsId.ADJUST_NONE)}
                          >
                            Learn More <RightOutlined style={{ fontSize: '10px' }} />
                          </button>
                          <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                            <ReactMarkdown>{indicatorDescriptions.ADJUST_NONE}</ReactMarkdown>
                          </div>
                        </div>
                      }
                      trigger="hover"
                    >
                      <QuestionCircleOutlined
                        style={{ fontSize: '11px', cursor: 'help' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popover>
                  </span>
                </Radio.Button>
                <Radio.Button
                  value="qfq"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: adjustType === 'qfq' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: adjustType === 'qfq' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: adjustType === 'qfq' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    前复权
                    <Popover
                      overlayInnerStyle={{
                        backgroundColor: '#1f1f1f',
                        color: '#ffffff',
                        border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                      }}
                      content={
                        <div className="indicator-popover-wrapper">
                          <button
                            className="indicator-learn-more"
                            onClick={() => onOpenKnowledge?.(indicatorDocsId.ADJUST_QFQ)}
                          >
                            Learn More <RightOutlined style={{ fontSize: '10px' }} />
                          </button>
                          <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                            <ReactMarkdown>{indicatorDescriptions.ADJUST_QFQ}</ReactMarkdown>
                          </div>
                        </div>
                      }
                      trigger="hover"
                    >
                      <QuestionCircleOutlined
                        style={{ fontSize: '11px', cursor: 'help' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popover>
                  </span>
                </Radio.Button>
                <Radio.Button
                  value="hfq"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                    height: '28px',
                    lineHeight: '24px',
                    background: adjustType === 'hfq' ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: adjustType === 'hfq' ? '1px solid #1890ff' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: adjustType === 'hfq' ? '#1890ff' : 'rgba(255, 255, 255, 0.65)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    后复权
                    <Popover
                      overlayInnerStyle={{
                        backgroundColor: '#1f1f1f',
                        color: '#ffffff',
                        border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                      }}
                      content={
                        <div className="indicator-popover-wrapper">
                          <button
                            className="indicator-learn-more"
                            onClick={() => onOpenKnowledge?.(indicatorDocsId.ADJUST_HFQ)}
                          >
                            Learn More <RightOutlined style={{ fontSize: '10px' }} />
                          </button>
                          <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                            <ReactMarkdown>{indicatorDescriptions.ADJUST_HFQ}</ReactMarkdown>
                          </div>
                        </div>
                      }
                      trigger="hover"
                    >
                      <QuestionCircleOutlined
                        style={{ fontSize: '11px', cursor: 'help' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popover>
                  </span>
                </Radio.Button>
              </Radio.Group>
            </ConfigProvider>
            </div>
          </div>

          {/* 右侧占位元素 - 与数据看板对齐 */}
          <div style={{ width: '200px' }}></div>
        </div>
      )}

      {/* 图表和数据看板容器 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '40px', width: '100%', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
        {/* 图表区域 - 自适应宽度 */}
        <div style={{ minWidth: 0, position: 'relative', height: '100%' }}>
          {/* 技术指标选择器 - 左上角 */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              zIndex: 10,
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              maxWidth: '60%',
            }}
          >
            <ConfigProvider
              theme={{
                components: {
                  Checkbox: {
                    colorPrimary: '#1890ff',
                    colorPrimaryHover: '#40a9ff',
                    fontSize: 12,
                  },
                },
              }}
            >
              <Checkbox.Group
                value={indicators}
                onChange={setIndicators}
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <Checkbox
                  className="indicator-checkbox"
                  value="MA5"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 109, 0, 0.15)',
                    border: indicators.includes('MA5') ? '1px solid #FF6D00' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#FF6D00', fontWeight: 500 }}>MA5</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.MA5)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.MA5}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#FF6D00', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="MA10"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 188, 212, 0.15)',
                    border: indicators.includes('MA10') ? '1px solid #00BCD4' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#00BCD4', fontWeight: 500 }}>MA10</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.MA10)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.MA10}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#00BCD4', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="MA20"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(156, 39, 176, 0.15)',
                    border: indicators.includes('MA20') ? '1px solid #9C27B0' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#9C27B0', fontWeight: 500 }}>MA20</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.MA20)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.MA20}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#9C27B0', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="EMA12"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    border: indicators.includes('EMA12') ? '1px solid #4CAF50' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#4CAF50', fontWeight: 500 }}>EMA12</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.EMA12)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.EMA12}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#4CAF50', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="EMA26"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 87, 34, 0.15)',
                    border: indicators.includes('EMA26') ? '1px solid #FF5722' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#FF5722', fontWeight: 500 }}>EMA26</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.EMA26)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.EMA26}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#FF5722', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="BOLL"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                    border: indicators.includes('BOLL') ? '1px solid #2196F3' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#2196F3', fontWeight: 500 }}>BOLL</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.BOLL)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.BOLL}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#2196F3', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
              </Checkbox.Group>
            </ConfigProvider>
          </div>

          {/* 技术指标选择器 - 放在成交量图和指标图之间 */}
          <div
            style={{
              position: 'absolute',
              top: '550px',
              left: '10px',
              zIndex: 10,
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <ConfigProvider
              theme={{
                components: {
                  Checkbox: {
                    colorPrimary: '#1890ff',
                    colorPrimaryHover: '#40a9ff',
                    fontSize: 12,
                  },
                },
              }}
            >
              <Checkbox.Group
                value={lowerIndicator ? [lowerIndicator] : []}
                onChange={(values) => setLowerIndicator(values[values.length - 1] || null)}
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <Checkbox
                  className="indicator-checkbox"
                  value="KDJ"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                    border: lowerIndicator === 'KDJ' ? '1px solid #2196F3' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#2196F3', fontWeight: 500 }}>KDJ</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.KDJ)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.KDJ}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#2196F3', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="MACD"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    border: lowerIndicator === 'MACD' ? '1px solid #4CAF50' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#4CAF50', fontWeight: 500 }}>MACD</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.MACD)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.MACD}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#4CAF50', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="RSI"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 152, 0, 0.15)',
                    border: lowerIndicator === 'RSI' ? '1px solid #FF9800' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#FF9800', fontWeight: 500 }}>RSI</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.RSI)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.RSI}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#FF9800', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="WR"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(233, 30, 99, 0.15)',
                    border: lowerIndicator === 'WR' ? '1px solid #E91E63' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#E91E63', fontWeight: 500 }}>WR</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.WR)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.WR}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#E91E63', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="DMI"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(103, 58, 183, 0.15)',
                    border: lowerIndicator === 'DMI' ? '1px solid #673AB7' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#673AB7', fontWeight: 500 }}>DMI</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.DMI)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.DMI}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#673AB7', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="CCI"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 188, 212, 0.15)',
                    border: lowerIndicator === 'CCI' ? '1px solid #00BCD4' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#00BCD4', fontWeight: 500 }}>CCI</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.CCI)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.CCI}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#00BCD4', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
                <Checkbox
                  className="indicator-checkbox"
                  value="BIAS"
                  style={{
                    margin: 0,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 87, 34, 0.15)',
                    border: lowerIndicator === 'BIAS' ? '1px solid #FF5722' : '1px solid transparent',
                    display: 'flex',
                                        alignItems: 'center',
                    gap: '4px',
                                      }}
                >
                  <span style={{ color: '#FF5722', fontWeight: 500 }}>BIAS</span>
                  <Popover
                    overlayInnerStyle={{
                      backgroundColor: '#1f1f1f',
                      color: '#ffffff',
                      border: '1px solid #3a3a3a',
                        boxShadow: '0 2px 8px rgba(255, 255, 255, 0.1)',
                    }}
                    content={
                      <div className="indicator-popover-wrapper">
                        <button 
                          className="indicator-learn-more" 
                          onClick={() => onOpenKnowledge?.(indicatorDocsId.BIAS)}
                        >
                          Learn More <RightOutlined style={{ fontSize: '10px' }} />
                        </button>
                        <div className="indicator-popover-content" style={{ width: popoverConfig.width, color: '#ffffff', fontSize: popoverConfig.fontSize, lineHeight: popoverConfig.lineHeight }}>
                          <ReactMarkdown>{indicatorDescriptions.BIAS}</ReactMarkdown>
                        </div>
                      </div>
                    }
                    trigger="hover"
                  >
                    <QuestionCircleOutlined
                      style={{ color: '#FF5722', fontSize: '11px', cursor: 'help', marginLeft: '4px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popover>
                </Checkbox>
              </Checkbox.Group>
            </ConfigProvider>
          </div>

          {/* K线图 */}
          <div
            ref={chartContainerRef}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>

        {/* 右侧：数据看板 - 固定200px，分为三个区块 */}
        <div
          style={{
            padding: '0 0 40px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}
        >
          {/* 第一块：K线数据 */}
          <div style={{ paddingTop: '0px' }}>
            {/* 交易日期 */}
            <div
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '12px',
                textAlign: 'left',
              }}
            >
              {displayData?.time || '--'}
            </div>

            {/* K线数据网格 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 12px' }}>
              {/* 开盘价 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>开盘价</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: displayData && displayData.previousClose
                    ? displayData.open > displayData.previousClose
                      ? '#ef232a'  // 红色：高于上一交易日收盘价
                      : displayData.open < displayData.previousClose
                      ? '#14b143'  // 绿色：低于上一交易日收盘价
                      : '#ffffff'  // 白色：等于上一交易日收盘价
                    : '#ffffff'
                }}>
                  {displayData ? displayData.open.toFixed(2) : '--'}
                </div>
              </div>
              {/* 收盘价 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>收盘价</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: displayData && displayData.previousClose
                    ? displayData.close > displayData.previousClose
                      ? '#ef232a'  // 红色：高于上一交易日收盘价
                      : displayData.close < displayData.previousClose
                      ? '#14b143'  // 绿色：低于上一交易日收盘价
                      : '#ffffff'  // 白色：等于上一交易日收盘价
                    : '#ffffff'
                }}>
                  {displayData ? displayData.close.toFixed(2) : '--'}
                </div>
              </div>

              {/* 最高 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>最高</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: displayData && displayData.previousClose
                    ? displayData.high > displayData.previousClose
                      ? '#ef232a'  // 红色：高于上一交易日收盘价
                      : displayData.high < displayData.previousClose
                      ? '#14b143'  // 绿色：低于上一交易日收盘价
                      : '#ffffff'  // 白色：等于上一交易日收盘价
                    : '#ffffff'
                }}>
                  {displayData ? displayData.high.toFixed(2) : '--'}
                </div>
              </div>
              {/* 最低 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>最低</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: displayData && displayData.previousClose
                    ? displayData.low > displayData.previousClose
                      ? '#ef232a'  // 红色：高于上一交易日收盘价
                      : displayData.low < displayData.previousClose
                      ? '#14b143'  // 绿色：低于上一交易日收盘价
                      : '#ffffff'  // 白色：等于上一交易日收盘价
                    : '#ffffff'
                }}>
                  {displayData ? displayData.low.toFixed(2) : '--'}
                </div>
              </div>

              {/* 涨幅(%) */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>涨幅(%)</div>
                <div
                  style={{
                    fontSize: '14px',
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
              {/* 涨幅(¥) */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>涨幅(¥)</div>
                <div
                  style={{
                    fontSize: '14px',
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
            </div>
          </div>

          {/* 第二块：成交量数据 */}
          <div
            style={{
              paddingTop: '12px',
              marginTop: '20px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '10px',
              }}
            >
              成交量
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              {/* 成交量 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>成交量</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: displayData
                    ? displayData.close > displayData.open
                      ? '#ef232a'
                      : displayData.close < displayData.open
                      ? '#14b143'
                      : '#ffffff'
                    : '#ffffff'
                }}>
                  {displayData ? `${(displayData.volume / 10000).toFixed(2)} 万手` : '--'}
                </div>
              </div>
              {/* 成交额 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>成交额</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: displayData
                    ? displayData.close > displayData.open
                      ? '#ef232a'
                      : displayData.close < displayData.open
                      ? '#14b143'
                      : '#ffffff'
                    : '#ffffff'
                }}>
                  {displayData ? `${(displayData.volume * displayData.close / 100000000).toFixed(2)} 亿元` : '--'}
                </div>
              </div>
              {/* 换手率 */}
              {displayData?.turn !== null && displayData?.turn !== undefined && (
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>换手率</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                    {displayData.turn.toFixed(2)}%
                  </div>
                </div>
              )}
              {/* 交易状态 */}
              {displayData?.tradeStatus !== null && displayData?.tradeStatus !== undefined && (
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>交易状态</div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: displayData.tradeStatus === 1 ? '#4CAF50' : '#FF9800'
                  }}>
                    {displayData.tradeStatus === 1 ? '正常交易' : '停牌'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 第二块半：估值指标 */}
          {(displayData?.peTtm !== null || displayData?.pbMrq !== null || displayData?.psTtm !== null || displayData?.pcfNcfTtm !== null) && (
            <div
              style={{
                paddingTop: '12px',
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '10px',
                }}
              >
                估值指标
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* PE TTM */}
                {displayData?.peTtm !== null && displayData?.peTtm !== undefined && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>PE(TTM)</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                      {displayData.peTtm.toFixed(2)}
                    </div>
                  </div>
                )}
                {/* PB MRQ */}
                {displayData?.pbMrq !== null && displayData?.pbMrq !== undefined && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>PB(MRQ)</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                      {displayData.pbMrq.toFixed(2)}
                    </div>
                  </div>
                )}
                {/* PS TTM */}
                {displayData?.psTtm !== null && displayData?.psTtm !== undefined && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>PS(TTM)</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                      {displayData.psTtm.toFixed(2)}
                    </div>
                  </div>
                )}
                {/* PCF TTM */}
                {displayData?.pcfNcfTtm !== null && displayData?.pcfNcfTtm !== undefined && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>PCF(TTM)</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                      {displayData.pcfNcfTtm.toFixed(2)}
                    </div>
                  </div>
                )}
                {/* ST状态 */}
                {displayData?.isSt !== null && displayData?.isSt !== undefined && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>ST状态</div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: displayData.isSt === 1 ? '#FF5722' : '#4CAF50'
                    }}>
                      {displayData.isSt === 1 ? 'ST' : '正常'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 第三块：技术指标数据 */}
          <div
            style={{
              paddingTop: '12px',
              marginTop: '20px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '10px',
              }}
            >
              技术指标
            </div>
            {lowerIndicator && displayData ? (() => {
              const dataIndex = data.findIndex(d => d.time === displayData.time)
              if (dataIndex === -1) return null

              if (lowerIndicator === 'KDJ') {
                const kdjData = calculateKDJ(data, 9, 3, 3)
                const kVal = kdjData.k[dataIndex]?.value
                const dVal = kdjData.d[dataIndex]?.value
                const jVal = kdjData.j[dataIndex]?.value
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div><span style={{ color: '#2196F3' }}>K: {kVal ? kVal.toFixed(2) : '--'}</span></div>
                    <div><span style={{ color: '#FF9800' }}>D: {dVal ? dVal.toFixed(2) : '--'}</span></div>
                    <div><span style={{ color: '#9C27B0' }}>J: {jVal ? jVal.toFixed(2) : '--'}</span></div>
                  </div>
                )
              } else if (lowerIndicator === 'MACD') {
                const macdData = calculateMACD(data, 12, 26, 9)
                const difVal = macdData.dif[dataIndex]?.value
                const deaVal = macdData.dea[dataIndex]?.value
                const macdVal = macdData.macd[dataIndex]?.value
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div><span style={{ color: '#2196F3' }}>DIF: {difVal !== null && difVal !== undefined ? difVal.toFixed(4) : '--'}</span></div>
                    <div><span style={{ color: '#FF9800' }}>DEA: {deaVal !== null && deaVal !== undefined ? deaVal.toFixed(4) : '--'}</span></div>
                    <div><span style={{ color: macdVal !== null && macdVal !== undefined && macdVal > 0 ? '#ef232a' : '#14b143' }}>MACD: {macdVal !== null && macdVal !== undefined ? macdVal.toFixed(4) : '--'}</span></div>
                  </div>
                )
              } else if (lowerIndicator === 'RSI') {
                const rsiData = calculateRSI(data, 14)
                const rsiVal = rsiData[dataIndex]?.value
                return (
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#2196F3' }}>RSI: {rsiVal ? rsiVal.toFixed(2) : '--'}</span>
                  </div>
                )
              } else if (lowerIndicator === 'WR') {
                const wrData = calculateWR(data, 14)
                const wrVal = wrData[dataIndex]?.value
                return (
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#2196F3' }}>WR: {wrVal ? wrVal.toFixed(2) : '--'}</span>
                  </div>
                )
              } else if (lowerIndicator === 'DMI') {
                const dmiData = calculateDMI(data, 14)
                const pdiVal = dmiData.pdi[dataIndex]?.value
                const mdiVal = dmiData.mdi[dataIndex]?.value
                const adxVal = dmiData.adx[dataIndex]?.value
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div><span style={{ color: '#2196F3' }}>PDI: {pdiVal ? pdiVal.toFixed(2) : '--'}</span></div>
                    <div><span style={{ color: '#FF9800' }}>MDI: {mdiVal ? mdiVal.toFixed(2) : '--'}</span></div>
                    <div><span style={{ color: '#9C27B0' }}>ADX: {adxVal ? adxVal.toFixed(2) : '--'}</span></div>
                  </div>
                )
              } else if (lowerIndicator === 'CCI') {
                const cciData = calculateCCI(data, 14)
                const cciVal = cciData[dataIndex]?.value
                return (
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#2196F3' }}>CCI: {cciVal ? cciVal.toFixed(2) : '--'}</span>
                  </div>
                )
              } else if (lowerIndicator === 'BIAS') {
                const biasData = calculateBIAS(data, 6)
                const biasVal = biasData[dataIndex]?.value
                return (
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ color: '#2196F3' }}>BIAS: {biasVal ? biasVal.toFixed(2) : '--'}%</span>
                  </div>
                )
              }
              return null
            })() : (
              <div style={{ fontSize: '11px', color: '#666' }}>
                未选择指标
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default StockChart
