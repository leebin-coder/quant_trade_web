import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, LineStyle } from 'lightweight-charts'
import './IntradayChart.css'

const normalizeDate = (value) => {
  if (!value) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const yyyy = value.getFullYear()
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const dd = String(value.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.includes('-')) return trimmed.split(' ')[0]
  if (trimmed.length === 8) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`
  }
  return trimmed
}

const formatTime = (value) => {
  if (!value || typeof value !== 'string') return '00:00:00'
  const trimmed = value.trim()
  if (!trimmed) return '00:00:00'
  if (trimmed.includes(':')) return trimmed
  if (trimmed.length >= 6) {
    return `${trimmed.slice(0, 2)}:${trimmed.slice(2, 4)}:${trimmed.slice(4, 6)}`
  }
  return trimmed
}

const buildTimestampLabel = (timestamp) => {
  if (timestamp === null || timestamp === undefined) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return {
    short: `${hh}:${mi}`,
    full: `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`,
  }
}

const parseTickTimestamp = (tick) => {
  const datePart = tick?.date || tick?.trade_date || tick?.trading_date
  if (!datePart) return null
  const normalizedDate = normalizeDate(datePart)
  if (!normalizedDate) return null
  const timePart = formatTime(tick?.time || tick?.trade_time || '00:00:00')
  const isoString = `${normalizedDate}T${timePart}+08:00`
  const parsed = Date.parse(isoString)
  if (Number.isNaN(parsed)) return null
  return parsed
}

const SESSION_SEGMENTS = [
  { start: '09:15:00', end: '09:25:00' },
  { start: '09:30:00', end: '11:30:00' },
  { start: '13:00:00', end: '14:57:00' },
  { start: '14:57:00', end: '15:00:00' },
]

const CROSSHAIR_LABEL_COLOR = '#ffd666'
const PRICE_MULTIPLIER = 100
const RIGHT_PADDING_RATIO = 0.11
const MIN_RIGHT_PADDING = 200

const getTickDate = (tick) => tick?.date || tick?.trade_date || tick?.trading_date || null

const buildDaySegments = (dateStr) => {
  if (!dateStr) return []
  const normalizedDate = normalizeDate(dateStr)
  if (!normalizedDate) return []
  const base = Date.parse(`${normalizedDate}T${SESSION_SEGMENTS[0].start}+08:00`)
  if (Number.isNaN(base)) return []
  let accumulated = 0
  return SESSION_SEGMENTS.map((session) => {
    const start = Date.parse(`${normalizedDate}T${session.start}+08:00`)
    const end = Date.parse(`${normalizedDate}T${session.end}+08:00`)
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return null
    }
    const virtualStart = base + accumulated
    const duration = end - start
    accumulated += duration
    return {
      start,
      end,
      virtualStart,
      virtualEnd: virtualStart + duration,
    }
  }).filter(Boolean)
}

const buildLabelMeta = (tick) => {
  if (!tick) {
    return { short: '', full: '' }
  }
  const datePart = normalizeDate(tick?.date || tick?.trade_date || tick?.trading_date || '')
  const timePart = formatTime(tick?.time || tick?.trade_time || '')
  const short = timePart ? timePart.slice(0, 5) : ''
  const full = datePart ? `${datePart} ${timePart}` : timePart
  return { short, full }
}

const formatTimeToSeconds = (timeStr) => {
  const normalized = formatTime(timeStr || '')
  const [hh, mm, ss] = normalized.split(':').map(num => Number(num) || 0)
  return hh * 3600 + mm * 60 + ss
}

const normalizeTicksForSessions = (ticks, fallbackDate) => {
  const safeTicks = Array.isArray(ticks) ? ticks : []
  const sampleDate = getTickDate(safeTicks.find((item) => getTickDate(item))) || fallbackDate
  const segments = buildDaySegments(sampleDate)
  const convertToVirtualTimestamp = (actualTs) => {
    if (!Number.isFinite(actualTs)) return null
    for (const segment of segments) {
      if (actualTs >= segment.start && actualTs <= segment.end) {
        return Math.floor((segment.virtualStart + (actualTs - segment.start)) / 1000)
      }
    }
    return Math.floor(actualTs / 1000)
  }
  const ordered = safeTicks.slice().sort((a, b) => {
    const left = parseTickTimestamp(a) || 0
    const right = parseTickTimestamp(b) || 0
    return left - right
  })
  const labels = new Map()
  const normalized = []
  const openingStart = formatTimeToSeconds('09:15:00')
  const openingEnd = formatTimeToSeconds('09:25:00')
  let postAuctionPrice = null
  const fallbackPreClose = resolvePreClose(safeTicks[0]) ?? null
  const openingPoints = []
  ordered.forEach((tick) => {
    const actualTs = parseTickTimestamp(tick)
    if (!actualTs) return
    const timeInSeconds = formatTimeToSeconds(tick?.time || tick?.trade_time || '')
    let price = resolvePrice(tick)
    if (postAuctionPrice === null && timeInSeconds >= openingEnd && price !== null && price !== 0) {
      postAuctionPrice = price
    }
    if (timeInSeconds >= openingStart && timeInSeconds < openingEnd) {
      const preCloseCandidate = resolvePreClose(tick) ?? fallbackPreClose
      if ((price === null || price === 0) && preCloseCandidate !== null && preCloseCandidate !== undefined) {
        price = preCloseCandidate
      }
    }
    const virtualTime = convertToVirtualTimestamp(actualTs)
    const point = {
      ...tick,
      virtualTime,
      __timestamp: actualTs,
      __rawPrice: price,
    }
    if (timeInSeconds >= openingStart && timeInSeconds < openingEnd) {
      openingPoints.push(point)
    }
    normalized.push(point)
    labels.set(virtualTime, buildLabelMeta(tick))
  })
  if (postAuctionPrice !== null) {
    openingPoints.forEach((point) => {
      point.__rawPrice = postAuctionPrice
      point.price = postAuctionPrice
    })
  } else if (fallbackPreClose !== null) {
    openingPoints.forEach((point) => {
      point.__rawPrice = fallbackPreClose
      point.price = fallbackPreClose
    })
  }
  normalized.forEach((point) => {
    if (point.__rawPrice !== null && point.__rawPrice !== undefined) {
      point.price = point.__rawPrice
    }
  })
  const sessionWindows = []
  segments.forEach((segment, index) => {
    sessionWindows.push({
      start: Math.floor(segment.virtualStart / 1000),
      end: Math.floor(segment.virtualEnd / 1000),
      type: index === 0 ? 'auction' : 'regular',
    })
  })
  const normalizedDate = normalizeDate(sampleDate)
  const firstVirtual = sessionWindows.length ? sessionWindows[0].start : null
  const lastVirtual = sessionWindows.length ? sessionWindows[sessionWindows.length - 1].end : null
  const earliestPointVirtual = normalized.length ? normalized[0].virtualTime : null
  const latestPointVirtual = normalized.length ? normalized[normalized.length - 1].virtualTime : null
  let fromTs = firstVirtual ?? earliestPointVirtual
  let toTs = lastVirtual ?? latestPointVirtual
  if (earliestPointVirtual !== null) {
    fromTs = Math.min(fromTs ?? earliestPointVirtual, earliestPointVirtual)
  }
  if (latestPointVirtual !== null) {
    toTs = Math.max(toTs ?? latestPointVirtual, latestPointVirtual)
  }
  if (!Number.isFinite(fromTs)) {
    const defaultStart = normalizedDate
      ? Math.floor(Date.parse(`${normalizedDate}T09:15:00+08:00`) / 1000)
      : null
    fromTs = defaultStart ?? Math.floor(Date.now() / 1000)
  }
  if (!Number.isFinite(toTs)) {
    const defaultEnd = normalizedDate
      ? Math.floor(Date.parse(`${normalizedDate}T15:00:00+08:00`) / 1000)
      : null
    toTs = defaultEnd ?? (fromTs + 60)
  }
  if (toTs <= fromTs) {
    toTs = fromTs + 60
  }
  const virtualRange = Number.isFinite(fromTs) && Number.isFinite(toTs)
    ? { from: Math.floor(fromTs), to: Math.floor(toTs) }
    : null

  return {
    points: normalized,
    labels,
    sessionWindows,
    virtualRange,
  }
}

const resolvePrice = (tick) => {
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

const resolveVolume = (tick) => {
  if (!tick) return 0
  const value = tick.vol || tick.volume || tick.traded_volume || tick.amount
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

const resolvePointHigh = (point, fallback) => {
  if (!point) return fallback ?? null
  const candidates = [
    point.high,
    point.highPrice,
    point.high_price,
    point.max,
    point.price,
    point.close,
  ]
  for (const value of candidates) {
    if (value === 0 || value) {
      const num = Number(value)
      if (!Number.isNaN(num)) {
        return num
      }
    }
  }
  return fallback ?? null
}

const resolvePointLow = (point, fallback) => {
  if (!point) return fallback ?? null
  const candidates = [
    point.low,
    point.lowPrice,
    point.low_price,
    point.min,
    point.price,
    point.close,
  ]
  for (const value of candidates) {
    if (value === 0 || value) {
      const num = Number(value)
      if (!Number.isNaN(num)) {
        return num
      }
    }
  }
  return fallback ?? null
}

const SCALE_LABEL_WIDTH = 10

const padScaleLabel = (label) => {
  const text = typeof label === 'string' ? label : String(label ?? '--')
  if (text.length >= SCALE_LABEL_WIDTH) return text
  return text.padStart(SCALE_LABEL_WIDTH, ' ')
}

const formatPriceValue = (scaledValue) => {
  if (scaledValue === null || scaledValue === undefined) return '--'
  const num = Number(scaledValue) / PRICE_MULTIPLIER
  if (!Number.isFinite(num)) return '--'
  return num.toFixed(2)
}

const buildLineSeriesData = (ticks) => {
  return ticks
    .map((tick) => {
      const price = resolvePrice(tick)
      const timestamp = tick.virtualTime
      if (!timestamp || price === null) return null
      return {
        time: timestamp,
        value: Math.round(price * PRICE_MULTIPLIER),
      }
    })
    .filter(Boolean)
}

const resolvePreClose = (tick) => {
  if (!tick) return null
  const candidates = [
    tick.preClose,
    tick.pre_close,
    tick.preclose,
    tick.preClosePrice,
    tick.prevClose,
    tick.previousClose,
    tick.pre_close_price,
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

const buildVolumeSeriesData = (ticks) => {
  return ticks
    .map((tick, index) => {
      const timestamp = tick.virtualTime
      const price = resolvePrice(tick)
      if (!timestamp || price === null) return null
      const volume = resolveVolume(tick)
      const prevVolume = resolveVolume(index > 0 ? ticks[index - 1] : null)
      const value = volume >= prevVolume && prevVolume > 0 ? volume - prevVolume : volume
      const prevTick = index > 0 ? ticks[index - 1] : null
      const prevPrice = resolvePrice(prevTick)
      let baseline = prevPrice
      if (baseline === null && !prevTick) {
        const preClose = resolvePreClose(tick)
        baseline = preClose === null ? baseline : preClose
      }
      if (baseline === null) {
        baseline = resolvePreClose(tick)
      }
      let color = '#8c8c8c'
      if (baseline !== null) {
        if (price > baseline) {
          color = '#f5222d'
        } else if (price < baseline) {
          color = '#52c41a'
        }
      }
      return {
        time: timestamp,
        value,
        color,
      }
    })
    .filter(Boolean)
}

const formatVolumeLabel = (value) => {
  if (value === null || value === undefined) return padScaleLabel('--')
  const num = Number(value)
  if (!Number.isFinite(num)) return padScaleLabel('--')
  const abs = Math.abs(num)
  let label
  if (abs >= 100000000) {
    label = `${(num / 100000000).toFixed(2)}亿`
  } else if (abs >= 10000) {
    label = `${(num / 10000).toFixed(2)}万`
  } else {
    label = `${Math.round(num)}`
  }
  return padScaleLabel(label)
}
function IntradayChart({ data = [], height = 520, stockInfo, statusLabel }) {
  const mainChartRef = useRef(null)
  const volumeChartRef = useRef(null)
  const mainChartInstanceRef = useRef(null)
  const mainSeriesRef = useRef(null)
  const skeletonSeriesRef = useRef(null)
  const skeletonDataRef = useRef([])
  const volumeChartInstanceRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const timeLabelRef = useRef(new Map())
  const scaleSyncCleanupRef = useRef(null)
  const scaleSyncLockRef = useRef(false)
  const hasFitInitialDataRef = useRef(false)
  const crosshairPriceLineRef = useRef(null)
  const lastInteractionRef = useRef(Date.now())
  const hoverStateRef = useRef(false)
  const autoCenterLockRef = useRef(false)
  const [blinkPhase, setBlinkPhase] = useState(false)
  const lastTickCountRef = useRef(0)
  const lastVirtualRangeRef = useRef(null)

  const heights = useMemo(() => {
    const minSecondary = 80
    const minVolume = 90
    const minMainReserve = 60
    const maxSecondary = Math.max(minSecondary, height - (minVolume + minMainReserve))
    let secondary = Math.round(height * 0.18)
    secondary = Math.max(minSecondary, Math.min(secondary, maxSecondary))

    const maxVolume = Math.max(minVolume, height - (secondary + minMainReserve))
    let volume = Math.round(height * 0.24)
    volume = Math.max(minVolume, Math.min(volume, maxVolume))

    let main = height - volume - secondary
    if (main < minMainReserve) {
      const deficit = minMainReserve - main
      const reducibleFromVolume = Math.max(0, volume - minVolume)
      const volumeReduction = Math.min(deficit, reducibleFromVolume)
      volume -= volumeReduction
      secondary = Math.max(minSecondary, secondary - (deficit - volumeReduction))
      main = height - volume - secondary
    }

    return { main, volume, secondary }
  }, [height])

  const fallbackDate = useMemo(() => {
    const tickWithDate = Array.isArray(data) ? data.find((item) => getTickDate(item)) : null
    if (tickWithDate) {
      const normalized = normalizeDate(getTickDate(tickWithDate))
      if (normalized) return normalized
    }
    const infoCandidates = [
      stockInfo?.tradeDate,
      stockInfo?.trade_date,
      stockInfo?.latestTradeDate,
      stockInfo?.latest_trade_date,
      stockInfo?.tradingDate,
      stockInfo?.trading_date,
      stockInfo?.quoteDate,
      stockInfo?.date,
    ]
    for (const candidate of infoCandidates) {
      const normalized = normalizeDate(candidate)
      if (normalized) return normalized
    }
    return normalizeDate(new Date())
  }, [data, stockInfo])

  const normalizedResult = useMemo(() => normalizeTicksForSessions(data, fallbackDate), [data, fallbackDate])
  const normalizedTicks = normalizedResult.points
  const hasLineData = useMemo(() => {
    return normalizedTicks.some((tick) => {
      const price = resolvePrice(tick)
      return Number.isFinite(tick?.virtualTime) && price !== null && price !== undefined
    })
  }, [normalizedTicks])
  const sessionWindows = normalizedResult.sessionWindows || []
  const virtualRange = normalizedResult.virtualRange
  const stockInfoPreClose = useMemo(() => resolvePreClose(stockInfo), [stockInfo])
  const previousClose = useMemo(() => {
    const tickPreClose = resolvePreClose(data?.[0])
    if (tickPreClose !== null && tickPreClose !== undefined) {
      return tickPreClose
    }
    if (stockInfoPreClose !== null && stockInfoPreClose !== undefined) {
      return stockInfoPreClose
    }
    return null
  }, [data, stockInfoPreClose])
  const stockInfoPrice = useMemo(() => resolvePrice(stockInfo), [stockInfo])
  const basePrice = useMemo(() => {
    const base = previousClose ?? resolvePrice(normalizedTicks[0]) ?? stockInfoPrice
    if (!base || !Number.isFinite(base) || base <= 0) return null
    return base
  }, [previousClose, normalizedTicks, stockInfoPrice])
  const tradingDayBounds = useMemo(() => {
    const normalized = normalizeDate(fallbackDate)
    if (!normalized) return null
    const dayStartMs = Date.parse(`${normalized}T09:15:00+08:00`)
    const dayEndMs = Date.parse(`${normalized}T15:00:00+08:00`)
    if (Number.isNaN(dayStartMs) || Number.isNaN(dayEndMs) || dayEndMs <= dayStartMs) return null
    return {
      start: Math.floor(dayStartMs / 1000),
      end: Math.floor(dayEndMs / 1000),
    }
  }, [fallbackDate])

  const paddedRange = useMemo(() => {
    if (!virtualRange || !Number.isFinite(virtualRange.from) || !Number.isFinite(virtualRange.to)) {
      return null
    }
    const startBase = Number.isFinite(tradingDayBounds?.start)
      ? tradingDayBounds.start
      : virtualRange.from
    const endBase = Math.max(virtualRange.to, startBase + 60)
    const coreSpan = Math.max(endBase - startBase, 1)
    const rightPad = Math.max(Math.floor(coreSpan * RIGHT_PADDING_RATIO), MIN_RIGHT_PADDING)
    const from = Math.max(0, Math.floor(startBase))
    let to = Math.floor(endBase + rightPad)
    if (Number.isFinite(tradingDayBounds?.end)) {
      to = Math.min(to, tradingDayBounds.end + Math.floor(rightPad * 0.5))
    }
    if (to <= from) {
      to = from + 60
    }
    return { from, to }
  }, [virtualRange, tradingDayBounds])
  const defaultVisibleRange = useMemo(() => {
    if (!paddedRange) return null
    return {
      from: Math.floor(paddedRange.from),
      to: Math.floor(paddedRange.to),
    }
  }, [paddedRange])
  const lastPoint = normalizedTicks.length ? normalizedTicks[normalizedTicks.length - 1] : null
  const lastHigh = resolvePointHigh(lastPoint, basePrice ?? null)
  const lastLow = resolvePointLow(lastPoint, basePrice ?? null)

  useEffect(() => {
    timeLabelRef.current = normalizedResult.labels
    if (!normalizedResult.points.length) {
      hasFitInitialDataRef.current = false
      hideCrosshairPriceLine()
    }
  }, [normalizedResult])
  useEffect(() => {
    const prevCount = lastTickCountRef.current
    if (!normalizedTicks.length || normalizedTicks.length < prevCount) {
      hasFitInitialDataRef.current = false
    }
    lastTickCountRef.current = normalizedTicks.length
  }, [normalizedTicks.length])

  useEffect(() => {
    if (!defaultVisibleRange) {
      lastVirtualRangeRef.current = null
      return
    }
    const nextRange = defaultVisibleRange
    const prevRange = lastVirtualRangeRef.current
    if (!prevRange || prevRange.from !== nextRange.from || prevRange.to !== nextRange.to) {
      hasFitInitialDataRef.current = false
      lastVirtualRangeRef.current = nextRange
    }
  }, [defaultVisibleRange])

  useEffect(() => {
    return () => {
      if (scaleSyncCleanupRef.current) {
        scaleSyncCleanupRef.current()
        scaleSyncCleanupRef.current = null
      }
    }
  }, [])

  const ensureCrosshairPriceLine = () => {
    if (!mainSeriesRef.current) return null
    if (!crosshairPriceLineRef.current) {
      crosshairPriceLineRef.current = mainSeriesRef.current.createPriceLine({
        price: 0,
        color: CROSSHAIR_LABEL_COLOR,
        lineVisible: true,
        axisLabelVisible: false,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      })
    }
    return crosshairPriceLineRef.current
  }

  const hideCrosshairPriceLine = () => {
    if (crosshairPriceLineRef.current) {
      crosshairPriceLineRef.current.applyOptions({
        axisLabelVisible: false,
        lineVisible: false,
      })
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBlinkPhase((prev) => !prev)
    }, 450)
    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__lastIntradayTickCount = normalizedTicks.length
    }
  }, [normalizedTicks.length])

  const extractLabelKey = (time) => {
    if (typeof time === 'number') {
      return Math.round(time)
    }
    if (time && typeof time === 'object' && 'timestamp' in time) {
      return Math.round(time.timestamp)
    }
    return null
  }

  const getLabelMeta = (time) => {
    const key = extractLabelKey(time)
    if (key === null) return null
    return timeLabelRef.current?.get(key) || null
  }

  const formatTickMark = (time) => {
    const meta = getLabelMeta(time)
    if (meta?.short) {
      return meta.short
    }
    const key = extractLabelKey(time)
    if (key !== null) {
      const date = new Date(key * 1000)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    return ''
  }

const formatCrosshairTime = (time) => {
  const meta = getLabelMeta(time)
  if (meta?.full) {
    return meta.full
  }
  const key = extractLabelKey(time)
  if (key !== null) {
    const date = new Date(key * 1000)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
  }
  return ''
}

const ensureScaleSync = () => {
  if (!mainChartInstanceRef.current || !volumeChartInstanceRef.current) return
  if (scaleSyncCleanupRef.current) return
    const mainScale = mainChartInstanceRef.current.timeScale()
    const volumeScale = volumeChartInstanceRef.current.timeScale()

    const syncFromMain = () => {
      if (scaleSyncLockRef.current) return
      const range = mainScale.getVisibleLogicalRange()
      if (!range) return
      scaleSyncLockRef.current = true
      volumeScale.setVisibleLogicalRange(range)
      scaleSyncLockRef.current = false
    }

    const syncFromVolume = () => {
      if (scaleSyncLockRef.current) return
      const range = volumeScale.getVisibleLogicalRange()
      if (!range) return
      scaleSyncLockRef.current = true
      mainScale.setVisibleLogicalRange(range)
      scaleSyncLockRef.current = false
    }

    mainScale.subscribeVisibleLogicalRangeChange(syncFromMain)
    volumeScale.subscribeVisibleLogicalRangeChange(syncFromVolume)

    scaleSyncCleanupRef.current = () => {
      mainScale.unsubscribeVisibleLogicalRangeChange(syncFromMain)
      volumeScale.unsubscribeVisibleLogicalRangeChange(syncFromVolume)
    }
  }

  useEffect(() => {
    if (!mainChartRef.current || mainChartInstanceRef.current) return
    const chart = createChart(mainChartRef.current, {
      layout: {
        background: { color: 'rgba(0,0,0,0)' },
        textColor: '#d1d1d1',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          visible: true,
          labelVisible: true,
          color: 'rgba(255, 255, 255, 0.35)',
          style: LineStyle.Dashed,
          width: 1,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: formatTickMark,
        barSpacing: 0.6,
        minBarSpacing: 0.5,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      localization: {
        locale: 'zh-CN',
        timeFormatter: formatCrosshairTime,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisDoubleClickReset: false,
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
      height: heights.main,
      autoSize: true,
    })
    const series = chart.addLineSeries({
      color: '#4fc3f7',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'custom',
        precision: 2,
        minMove: 1,
        formatter: formatPriceValue,
      },
    })
    const skeletonSeries = chart.addLineSeries({
      color: 'rgba(0,0,0,0)',
      lineWidth: 0.0001,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      priceFormat: {
        type: 'custom',
        precision: 2,
        minMove: 1,
        formatter: formatPriceValue,
      },
      priceScaleId: 'ghost',
    })
    chart.priceScale('ghost').applyOptions({
      visible: false,
      autoScale: false,
      scaleMargins: {
        top: 1,
        bottom: 0,
      },
    })
    mainChartInstanceRef.current = chart
    mainSeriesRef.current = series
    skeletonSeriesRef.current = skeletonSeries
    if (skeletonDataRef.current.length) {
      skeletonSeries.setData(skeletonDataRef.current)
    }
    ensureScaleSync()
    const mainTimeScale = chart.timeScale()
    const handleCrosshairMove = (param) => {
      if (!param || !param.point || param.point.x < 0 || param.point.y < 0) {
        hideCrosshairPriceLine()
        return
      }
      const priceMap = param.seriesPrices
      let price = priceMap && mainSeriesRef.current ? priceMap.get(mainSeriesRef.current) : undefined
      if ((price === undefined || price === null) && param?.seriesData && mainSeriesRef.current) {
        const dataPoint = param.seriesData.get(mainSeriesRef.current)
        price = dataPoint?.value ?? dataPoint?.close ?? null
      }
      if (price === undefined || price === null) {
        hideCrosshairPriceLine()
        return
      }
      const line = ensureCrosshairPriceLine()
      line?.applyOptions({
        price,
        color: CROSSHAIR_LABEL_COLOR,
        axisLabelVisible: true,
        lineVisible: true,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
      })
    }

    chart.subscribeCrosshairMove(handleCrosshairMove)

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height: nextHeight } = entry.contentRect
        chart.applyOptions({
          width,
          height: nextHeight,
        })
      }
    })
    resizeObserver.observe(mainChartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      if (crosshairPriceLineRef.current && mainSeriesRef.current) {
        mainSeriesRef.current.removePriceLine(crosshairPriceLineRef.current)
        crosshairPriceLineRef.current = null
      }
      if (skeletonSeriesRef.current) {
        chart.removeSeries(skeletonSeriesRef.current)
        skeletonSeriesRef.current = null
      }
      chart.remove()
      mainChartInstanceRef.current = null
      mainSeriesRef.current = null
    }
  }, [heights.main])

  useEffect(() => {
    if (!volumeChartRef.current || volumeChartInstanceRef.current) return
    const chart = createChart(volumeChartRef.current, {
      layout: {
        background: { color: 'rgba(0,0,0,0)' },
        textColor: '#9fa2b4',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.08,
          bottom: 0.05,
        },
      },
      timeScale: {
        borderVisible: false,
        visible: true,
        secondsVisible: true,
        timeVisible: true,
        tickMarkFormatter: formatTickMark,
        barSpacing: 0.6,
        minBarSpacing: 0.5,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      localization: {
        locale: 'zh-CN',
        timeFormatter: formatCrosshairTime,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          visible: true,
          labelVisible: true,
          color: 'rgba(255, 255, 255, 0.35)',
          style: LineStyle.Dashed,
          width: 1,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisDoubleClickReset: false,
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
      height: heights.volume,
      autoSize: true,
    })
    const series = chart.addHistogramSeries({
      color: '#4fc3f7',
      priceFormat: {
        type: 'custom',
        formatter: formatVolumeLabel,
      },
      lastValueVisible: false,
      priceLineVisible: true,
      priceScaleId: '',
    })
    chart.priceScale('').applyOptions({
      visible: true,
      borderVisible: false,
      autoScale: true,
      ticksVisible: true,
      entireTextOnly: false,
      alignLabels: true,
      scaleMargins: {
        top: 0.08,
        bottom: 0.05,
      },
    })
    volumeChartInstanceRef.current = chart
    volumeSeriesRef.current = series
    ensureScaleSync()

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height: nextHeight } = entry.contentRect
        chart.applyOptions({
          width,
          height: nextHeight,
        })
      }
    })
    resizeObserver.observe(volumeChartRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      volumeChartInstanceRef.current = null
      volumeSeriesRef.current = null
    }
  }, [heights.volume])

  useEffect(() => {
    mainChartInstanceRef.current?.applyOptions({ height: heights.main })
  }, [heights.main])

  useEffect(() => {
    volumeChartInstanceRef.current?.applyOptions({ height: heights.volume })
  }, [heights.volume])

  const skeletonData = useMemo(() => {
    const effectiveRange = paddedRange || virtualRange
    if (!effectiveRange) return []
    const reference = basePrice && Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 1
    const value = Math.round(reference * PRICE_MULTIPLIER)
    const seen = new Set()
    const points = []
    const addPoint = (rawTime) => {
      if (rawTime === undefined || rawTime === null || Number.isNaN(rawTime)) return
      const key = Math.round(rawTime)
      if (seen.has(key)) return
      seen.add(key)
      points.push({ time: key, value })
    }
    sessionWindows?.forEach((session) => {
      addPoint(session.start)
      addPoint(session.end)
    })
    addPoint(effectiveRange.from)
    addPoint(effectiveRange.to)
    points.sort((a, b) => a.time - b.time)
    return points
  }, [sessionWindows, virtualRange, paddedRange, basePrice])

  useEffect(() => {
    const lineData = buildLineSeriesData(normalizedTicks)
    if (mainSeriesRef.current) {
      mainSeriesRef.current.setData(lineData)
      if (!lineData.length) {
        mainSeriesRef.current.setMarkers([])
      }
    }
    const volumeData = buildVolumeSeriesData(normalizedTicks)
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumeData)
    }
  }, [normalizedTicks])

  useEffect(() => {
    skeletonDataRef.current = skeletonData
    if (!skeletonSeriesRef.current) return
    skeletonSeriesRef.current.setData(skeletonData)
  }, [skeletonData])

  useEffect(() => {
    if (!defaultVisibleRange) return
    if (!hasLineData) return
    if (hasFitInitialDataRef.current) return
    const mainScale = mainChartInstanceRef.current?.timeScale()
    const volumeScale = volumeChartInstanceRef.current?.timeScale()
    if (!mainScale || !volumeScale) return
    autoCenterLockRef.current = true
    mainScale.setVisibleRange(defaultVisibleRange)
    volumeScale.setVisibleRange(defaultVisibleRange)
    autoCenterLockRef.current = false
    hasFitInitialDataRef.current = true
  }, [defaultVisibleRange, hasLineData])

  useEffect(() => {
    const series = mainSeriesRef.current
    const chart = mainChartInstanceRef.current
    if (!series) return
    if (!chart) {
      series.applyOptions({ autoscaleInfoProvider: undefined })
      chart?.priceScale('right').applyOptions({ autoScale: true })
      return
    }
    const reference = basePrice && Number.isFinite(basePrice) && basePrice > 0 ? basePrice : null
    const buffer = reference ? Math.max(reference * 0.001, 0.01) : 0.01
    const anchor = reference ?? 1
    const highBase = lastHigh ?? anchor
    const lowBase = lastLow ?? anchor
    const upper = Math.round((highBase + buffer) * PRICE_MULTIPLIER)
    const lower = Math.round(Math.max(lowBase - buffer, 0.01) * PRICE_MULTIPLIER)
    const provider = () => ({
      priceRange: {
        minValue: lower,
        maxValue: upper,
      },
    })
    series.applyOptions({
      autoscaleInfoProvider: provider,
    })
    chart.priceScale('right').applyOptions({
      visible: true,
      borderVisible: false,
      ticksVisible: true,
      entireTextOnly: false,
      alignLabels: true,
      autoScale: false,
      scaleMargins: {
        top: 0.12,
        bottom: 0.12,
      },
    })
    return () => {
      series.applyOptions({ autoscaleInfoProvider: undefined })
      chart.priceScale('right').applyOptions({ autoScale: true })
    }
  }, [basePrice, lastHigh, lastLow])

  useEffect(() => {
    if (!mainSeriesRef.current) return
    if (!normalizedTicks.length || !hasLineData) {
      mainSeriesRef.current.setMarkers([])
      return
    }
    let lastPoint = null
    let lastPrice = null
    for (let i = normalizedTicks.length - 1; i >= 0; i -= 1) {
      const candidate = normalizedTicks[i]
      const candidatePrice = resolvePrice(candidate)
      if (candidate?.virtualTime && candidatePrice !== null && candidatePrice !== undefined && Number.isFinite(candidatePrice)) {
        lastPoint = candidate
        lastPrice = candidatePrice
        break
      }
    }
    if (!lastPoint || lastPrice === null) {
      mainSeriesRef.current.setMarkers([])
      return
    }
    const glowColor = 'rgba(255, 214, 102, 0.25)'
    const coreColor = blinkPhase ? '#ffd666' : 'rgba(255, 214, 102, 0.5)'
    mainSeriesRef.current.setMarkers([
      {
        time: lastPoint.virtualTime,
        position: 'inBar',
        color: glowColor,
        shape: 'circle',
        size: 2,
        text: '',
        price: Math.round(lastPrice * PRICE_MULTIPLIER),
      },
      {
        time: lastPoint.virtualTime,
        position: 'inBar',
        color: coreColor,
        shape: 'circle',
        size: 0.6,
        text: '',
        price: Math.round(lastPrice * PRICE_MULTIPLIER),
      },
    ])
  }, [normalizedTicks, blinkPhase, hasLineData])

  const handlePointerActivity = () => {
    lastInteractionRef.current = Date.now()
  }

  const handleMouseEnter = () => {
    hoverStateRef.current = true
  }

  const handleMouseLeave = () => {
    hoverStateRef.current = false
    hideCrosshairPriceLine()
  }



  return (
    <div className="intraday-chart-root">
      <div
        className="intraday-chart-panels"
        style={{ height }}
        onPointerDown={handlePointerActivity}
        onWheel={handlePointerActivity}
        onTouchStart={handlePointerActivity}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="intraday-main-chart"
          style={{ height: heights.main }}
        >
          <div
            className="intraday-chart-surface"
            ref={mainChartRef}
            style={{ height: heights.main }}
          />
        </div>
        <div className="intraday-volume-chart" style={{ height: heights.volume }}>
          <div
            className="intraday-volume-surface"
            ref={volumeChartRef}
            style={{ height: heights.volume }}
          />
        </div>
        <div
          className="intraday-secondary-panel"
          style={{ height: heights.secondary }}
        >
          <div className="intraday-secondary-placeholder">副图占位，敬请期待</div>
        </div>
      </div>
    </div>
  )
}

export default IntradayChart
