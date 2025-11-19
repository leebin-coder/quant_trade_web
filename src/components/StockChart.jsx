import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import { Select, ConfigProvider, Checkbox, Radio } from 'antd'

/**
 * TradingView Lightweight Charts - K线图 + 成交量图组件
 * @param {Object} props
 * @param {Array} props.data - K线数据 [{time: '2023-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000000}]
 * @param {Number} props.height - 图表总高度，默认 600
 * @param {String} props.title - 图表标题
 */
function StockChart({ data = [], height = 600, title = '' }) {
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
  const [adjustType, setAdjustType] = useState('none') // 复权类型: none-未复权, qfq-前复权, hfq-后复权
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
    const timerId = setTimeout(() => {
      if (!chartContainerRef.current) return

      try {
        // 动态计算图表宽度 = 容器宽度
        const containerWidth = chartContainerRef.current.clientWidth || 1000

        // 创建图表 (v3.8 API)
        const chart = createChart(chartContainerRef.current, {
          width: containerWidth,
          height: 934,
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

        // K线价格刻度设置 - 占用上方55%空间
        // top: 从顶部留白的百分比, bottom: 从底部留白的百分比
        chart.priceScale('right').applyOptions({
          autoScale: true,
          alignLabels: true,
          scaleMargins: {
            top: 0.05,      // 顶部留5%空白，避免被选择器覆盖
            bottom: 0.46,  // 底部留46%空白 (5% - 54%)
          },
        })

        // 添加成交量系列 - 使用独立价格刻度
        const volumeSeries = chart.addHistogramSeries({
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',  // 独立的价格刻度ID
        })

        // 成交量价格刻度设置 - 占用中间18%空间 (56% - 74%)
        chart.priceScale('volume').applyOptions({
          visible: false,  // 隐藏volume的价格刻度
          autoScale: true,
          alignLabels: false,
          scaleMargins: {
            top: 0.56,     // 顶部留56%空白
            bottom: 0.26,  // 底部留26%空白 (56% - 74%)
          },
        })

        // 创建一个占位系列来初始化 'lower' 价格刻度
        const lowerPlaceholder = chart.addLineSeries({
          priceScaleId: 'lower',
          visible: false,
        })
        lowerPlaceholder.setData([{ time: '2020-01-01', value: 0 }])

        // 技术指标价格刻度设置 - 占用下方25%空间 (74% - 99%)
        chart.priceScale('lower').applyOptions({
          visible: false,  // 隐藏lower的价格刻度
          autoScale: true,
          alignLabels: false,
          mode: 0,  // 正常模式
          scaleMargins: {
            top: 0.76,     // 顶部留76%空白（在指标区域内部增加上边距）
            bottom: 0.03,   // 底部留3%空白（在指标区域内部增加下边距）
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
            chartRef.current.resize(newWidth, 934)
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
      setIsChartReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

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
    if (!isChartReady || !candlestickSeriesRef.current || !data || data.length === 0) {
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

      console.log('📊 图表数据已加载:', data.length, '条')
      console.log('   时间格式示例:', data[0]?.time, typeof data[0]?.time)

      candlestickSeriesRef.current.setData(candlestickData)

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

      console.log('📊 成交量数据已加载')
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
    const previousClose = getPreviousClose(currentIndex)
    const { changePercent, changeAmount } = calculateChange(selectedData.close, previousClose)

    return {
      ...selectedData,
      changePercent,
      changeAmount,
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

  // 监控selectedData变化
  useEffect(() => {
    if (selectedData) {
      console.log('📈 右侧面板更新 -', selectedData.time, '开:', selectedData.open, '收:', selectedData.close)
    }
  }, [selectedData])

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
    <div style={{ width: '100%', height: '100%' }}>
      {/* 标题 */}
      {title && (
        <div
          style={{
            textAlign: 'left',
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '20px',
            marginLeft: '84px', // 与图表左侧对齐
            color: '#ffffff',
          }}
        >
          {title}
        </div>
      )}

      {/* 图表和数据看板容器 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '40px', width: '126%', maxWidth: '1960px', margin: '0 auto', paddingLeft: '84px', paddingRight: '40px' }}>
        {/* 图表区域 - 自适应宽度，从左侧开始 */}
        <div style={{ minWidth: 0, position: 'relative' }}>
          {/* 技术指标选择器 - 左上角 */}
          <div
            style={{
              position: 'absolute',
              left: '10px',
              zIndex: 10,
              display: 'flex',
              gap: '12px',
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
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <Checkbox
                  value="MA5"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 109, 0, 0.15)',
                    border: indicators.includes('MA5') ? '1px solid #FF6D00' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#FF6D00', fontWeight: 500 }}>MA5</span>
                </Checkbox>
                <Checkbox
                  value="MA10"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 188, 212, 0.15)',
                    border: indicators.includes('MA10') ? '1px solid #00BCD4' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#00BCD4', fontWeight: 500 }}>MA10</span>
                </Checkbox>
                <Checkbox
                  value="MA20"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(156, 39, 176, 0.15)',
                    border: indicators.includes('MA20') ? '1px solid #9C27B0' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#9C27B0', fontWeight: 500 }}>MA20</span>
                </Checkbox>
                <Checkbox
                  value="EMA12"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    border: indicators.includes('EMA12') ? '1px solid #4CAF50' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#4CAF50', fontWeight: 500 }}>EMA12</span>
                </Checkbox>
                <Checkbox
                  value="EMA26"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 87, 34, 0.15)',
                    border: indicators.includes('EMA26') ? '1px solid #FF5722' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#FF5722', fontWeight: 500 }}>EMA26</span>
                </Checkbox>
                <Checkbox
                  value="BOLL"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                    border: indicators.includes('BOLL') ? '1px solid #2196F3' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#2196F3', fontWeight: 500 }}>BOLL</span>
                </Checkbox>
              </Checkbox.Group>
            </ConfigProvider>
          </div>

          {/* 技术指标选择器 - 放在成交量图和指标图之间 */}
          <div
            style={{
              position: 'absolute',
              top: '680px',
              left: '10px',
              zIndex: 10,
              display: 'flex',
              gap: '12px',
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
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <Checkbox
                  value="KDJ"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                    border: lowerIndicator === 'KDJ' ? '1px solid #2196F3' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#2196F3', fontWeight: 500 }}>KDJ</span>
                </Checkbox>
                <Checkbox
                  value="MACD"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    border: lowerIndicator === 'MACD' ? '1px solid #4CAF50' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#4CAF50', fontWeight: 500 }}>MACD</span>
                </Checkbox>
                <Checkbox
                  value="RSI"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 152, 0, 0.15)',
                    border: lowerIndicator === 'RSI' ? '1px solid #FF9800' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#FF9800', fontWeight: 500 }}>RSI</span>
                </Checkbox>
                <Checkbox
                  value="WR"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(233, 30, 99, 0.15)',
                    border: lowerIndicator === 'WR' ? '1px solid #E91E63' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#E91E63', fontWeight: 500 }}>WR</span>
                </Checkbox>
                <Checkbox
                  value="DMI"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(103, 58, 183, 0.15)',
                    border: lowerIndicator === 'DMI' ? '1px solid #673AB7' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#673AB7', fontWeight: 500 }}>DMI</span>
                </Checkbox>
                <Checkbox
                  value="CCI"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 188, 212, 0.15)',
                    border: lowerIndicator === 'CCI' ? '1px solid #00BCD4' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#00BCD4', fontWeight: 500 }}>CCI</span>
                </Checkbox>
                <Checkbox
                  value="BIAS"
                  style={{
                    margin: 0,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 87, 34, 0.15)',
                    border: lowerIndicator === 'BIAS' ? '1px solid #FF5722' : '1px solid transparent',
                  }}
                >
                  <span style={{ color: '#FF5722', fontWeight: 500 }}>BIAS</span>
                </Checkbox>
              </Checkbox.Group>
            </ConfigProvider>
          </div>

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
              height: '934px',
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
          <div style={{ paddingTop: '47px' }}>
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
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                  {displayData ? displayData.open.toFixed(2) : '--'}
                </div>
              </div>
              {/* 收盘价 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>收盘价</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
                  {displayData ? displayData.close.toFixed(2) : '--'}
                </div>
              </div>

              {/* 最高 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>最高</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#ef232a' }}>
                  {displayData ? displayData.high.toFixed(2) : '--'}
                </div>
              </div>
              {/* 最低 */}
              <div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '3px' }}>最低</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#14b143' }}>
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
            </div>
          </div>

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
                const macdVal = macdData.macd[dataIndex]?.value
                const signalVal = macdData.signal[dataIndex]?.value
                const histVal = macdData.histogram[dataIndex]?.value
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div><span style={{ color: '#2196F3' }}>DIF: {macdVal ? macdVal.toFixed(4) : '--'}</span></div>
                    <div><span style={{ color: '#FF9800' }}>DEA: {signalVal ? signalVal.toFixed(4) : '--'}</span></div>
                    <div><span style={{ color: histVal > 0 ? '#ef232a' : '#14b143' }}>MACD: {histVal ? histVal.toFixed(4) : '--'}</span></div>
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
