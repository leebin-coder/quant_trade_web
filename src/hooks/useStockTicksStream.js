import { useCallback, useEffect, useRef, useState } from 'react'
import { getEffectiveTradingDate } from '../utils/tradingSession'

const DEFAULT_RECONNECT_DELAY = 3000
const DEFAULT_PORT = ''
const DEFAULT_PATH = '/ws/ticks'
const SESSION_SEGMENTS = [
  { start: '09:15:00', end: '09:25:00' },
  { start: '09:30:00', end: '11:30:00' },
  { start: '13:00:00', end: '14:57:00' },
  { start: '14:57:00', end: '15:00:00' },
]
const sessionCache = new Map()
const INITIAL_STREAM_STATE = {
  status: 'non_trading',
  historyTicks: [],
  latestTicks: [],
  ticks: [],
  tradeDate: null,
  connectionState: 'idle',
  hasData: false,
}

const buildTickKey = (tick) => {
  if (!tick) return ''
  const date = tick.date || tick.trade_date || tick.trading_date || ''
  const time = tick.time || tick.trade_time || ''
  const code = tick.ts_code || tick.symbol || ''
  return `${date}-${time}-${code}`
}

const sortTicks = (ticks) => {
  return ticks.slice().sort((a, b) => {
    const left = `${a.date || ''} ${a.time || ''}`
    const right = `${b.date || ''} ${b.time || ''}`
    if (left === right) return 0
    return left > right ? 1 : -1
  })
}

const normalizeTicks = (ticks) => {
  if (!Array.isArray(ticks) || ticks.length === 0) {
    return []
  }
  const map = new Map()
  ticks.forEach((tick) => {
    const key = buildTickKey(tick)
    if (key) {
      map.set(key, tick)
    }
  })
  return sortTicks(Array.from(map.values()))
}

const normalizeDateString = (value) => {
  if (!value || typeof value !== 'string') return ''
  if (value.includes('-')) return value
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  }
  return value
}

const parseDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null
  const isoDate = normalizeDateString(dateStr)
  if (!isoDate) return null
  let normalizedTime = timeStr.trim()
  if (!normalizedTime.includes(':')) {
    if (normalizedTime.length < 6) return null
    normalizedTime = `${normalizedTime.slice(0, 2)}:${normalizedTime.slice(2, 4)}:${normalizedTime.slice(4, 6)}`
  }
  const composed = `${isoDate}T${normalizedTime}+08:00`
  const parsed = Date.parse(composed)
  if (Number.isNaN(parsed)) return null
  return parsed
}

const getSessionBoundaries = (dateStr) => {
  const isoDate = normalizeDateString(dateStr)
  if (!isoDate) return []
  if (sessionCache.has(isoDate)) {
    return sessionCache.get(isoDate)
  }
  const boundaries = SESSION_SEGMENTS.map(({ start, end }) => {
    const startTs = Date.parse(`${isoDate}T${start}+08:00`)
    const endTs = Date.parse(`${isoDate}T${end}+08:00`)
    if (Number.isNaN(startTs) || Number.isNaN(endTs)) return null
    return { start: startTs, end: endTs }
  }).filter(Boolean)
  sessionCache.set(isoDate, boundaries)
  return boundaries
}

const INVALID_TICK_REASONS = {
  missing_datetime: '缺少日期或时间',
  invalid_datetime: '时间格式异常',
  out_of_session: '超出交易时间范围',
}

const isWithinSessions = (timestamp, dateStr) => {
  if (!timestamp || !dateStr) return true
  const boundaries = getSessionBoundaries(dateStr)
  if (!boundaries.length) return true
  return boundaries.some(({ start, end }) => timestamp >= start && timestamp <= end)
}

const filterValidTicks = (ticks, options = {}) => {
  if (!Array.isArray(ticks) || ticks.length === 0) {
    return []
  }
  const { onInvalid } = options
  const valid = []
  ticks.forEach((tick) => {
    const datePart = tick?.date || tick?.trade_date || tick?.trading_date || ''
    const timePart = tick?.time || tick?.trade_time || ''
    if (!datePart || !timePart || typeof datePart !== 'string' || typeof timePart !== 'string') {
      onInvalid?.(tick, INVALID_TICK_REASONS.missing_datetime)
      return
    }
    const timestamp = parseDateTime(datePart, timePart)
    if (timestamp === null) {
      onInvalid?.(tick, INVALID_TICK_REASONS.invalid_datetime)
      return
    }
    if (!isWithinSessions(timestamp, datePart)) {
      onInvalid?.(tick, INVALID_TICK_REASONS.out_of_session)
      return
    }
    valid.push({ ...tick, __timestamp: timestamp })
  })
  if (!valid.length && ticks.length) {
    return ticks
  }
  return valid
}

const resolveEnv = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
  const protocol = env.VITE_QUANT_GATEWAY_WS_PROTOCOL || env.VITE_QUANT_MARKET_WS_PROTOCOL || (window.location.protocol === 'https:' ? 'wss' : 'ws')
  const host = env.VITE_QUANT_GATEWAY_WS_HOST || env.VITE_QUANT_MARKET_WS_HOST || window.location.hostname
  const rawPort = Object.prototype.hasOwnProperty.call(env, 'VITE_QUANT_GATEWAY_WS_PORT')
    ? env.VITE_QUANT_GATEWAY_WS_PORT
    : Object.prototype.hasOwnProperty.call(env, 'VITE_QUANT_MARKET_WS_PORT')
      ? env.VITE_QUANT_MARKET_WS_PORT
      : undefined
  const defaultPort = typeof window !== 'undefined'
    ? (window.location.port || '')
    : DEFAULT_PORT
  const port = rawPort === '' ? '' : (rawPort || defaultPort)
  const path = env.VITE_QUANT_GATEWAY_WS_PATH || env.VITE_QUANT_MARKET_WS_PATH || DEFAULT_PATH

  if (!host) {
    return null
  }

  return {
    protocol,
    host,
    port,
    path,
  }
}

const buildWsUrl = (stockCode, tradeDate) => {
  if (!stockCode || !tradeDate) return null
  const envConfig = resolveEnv()
  if (!envConfig) return null

  const { protocol, host, port, path } = envConfig
  const portSegment = port ? `:${port}` : ''
  const query = new URLSearchParams({
    stockCode,
    date: tradeDate,
  })

  return `${protocol}://${host}${portSegment}${path}?${query.toString()}`
}

export function useStockTicksStream({ stockCode, enabled, tradeDate }) {
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const stockCodeRef = useRef(stockCode)
  const enabledRef = useRef(enabled)
  const tradingFinishedRef = useRef(false)
  const connectRef = useRef(null)
  const historyRef = useRef([])
  const mergedTicksRef = useRef([])
  const [streamState, setStreamState] = useState(INITIAL_STREAM_STATE)
  const [resolvedTradeDate, setResolvedTradeDate] = useState(() => tradeDate || getEffectiveTradingDate())

  useEffect(() => {
    stockCodeRef.current = stockCode
  }, [stockCode])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    const nextResolved = tradeDate || getEffectiveTradingDate()
    setResolvedTradeDate((prev) => (prev === nextResolved ? prev : nextResolved))
  }, [tradeDate])

  useEffect(() => {
    if (tradeDate || typeof window === 'undefined') {
      return undefined
    }

    const syncLatestTradingDate = () => {
      const nextResolved = getEffectiveTradingDate()
      setResolvedTradeDate((prev) => (prev === nextResolved ? prev : nextResolved))
    }

    syncLatestTradingDate()
    const timerId = window.setInterval(syncLatestTradingDate, 60 * 1000)
    return () => {
      window.clearInterval(timerId)
    }
  }, [tradeDate])

  const resetState = useCallback(() => {
    historyRef.current = []
    mergedTicksRef.current = []
    setStreamState(INITIAL_STREAM_STATE)
  }, [])

  const updateConnectionState = useCallback((nextState) => {
    setStreamState((prev) => {
      if (prev.connectionState === nextState) {
        return prev
      }
      return {
        ...prev,
        connectionState: nextState,
      }
    })
  }, [])

  const logInvalidTick = useCallback((tick, reasonText) => {
    if (!tick) return
    const code = tick.ts_code || tick.symbol || stockCodeRef.current || 'N/A'
    const dateStr = normalizeDateString(tick.date || tick.trade_date || tick.trading_date || '')
    const timeStr = tick.time || tick.trade_time || '--'
    console.log(`[TickWS:${code}] ⚠️ 丢弃异常 tick: ${reasonText} [${dateStr || '--'} ${timeStr}]`)
  }, [])

  const applyTickPayload = useCallback((payload, tradeDateMeta) => {
    setStreamState((prev) => {
      const rawStatus = payload?.status || prev.status || 'non_trading'
      const normalizedStatus = rawStatus === 'rest' ? 'non_trading' : rawStatus
      const incomingHistory = Array.isArray(payload?.historyTicks) ? payload.historyTicks : []
      const incomingLatest = Array.isArray(payload?.latestTicks) ? payload.latestTicks : []
      let filteredHistory = filterValidTicks(incomingHistory, { onInvalid: logInvalidTick })
      let filteredLatest = filterValidTicks(incomingLatest, { onInvalid: logInvalidTick })

      if (!filteredHistory.length && incomingHistory.length) {
        filteredHistory = incomingHistory
      }
      if (!filteredLatest.length && incomingLatest.length) {
        filteredLatest = incomingLatest
      }

      if (filteredHistory.length) {
        historyRef.current = filteredHistory
      } else if (incomingHistory.length) {
        historyRef.current = incomingHistory
      }

      mergedTicksRef.current = normalizeTicks([
        ...historyRef.current,
        ...filteredLatest,
      ])

      return {
        status: normalizedStatus,
        historyTicks: historyRef.current,
        latestTicks: filteredLatest,
        ticks: mergedTicksRef.current,
        tradeDate: tradeDateMeta ?? prev.tradeDate ?? resolvedTradeDate ?? null,
        connectionState: prev.connectionState,
        hasData: mergedTicksRef.current.length > 0,
      }
    })
  }, [logInvalidTick, resolvedTradeDate])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const closeSocket = useCallback((label = '主动关闭') => {
    clearReconnectTimer()
    const currentSocket = socketRef.current
    if (currentSocket) {
      socketRef.current = null
      currentSocket.onopen = null
      currentSocket.onmessage = null
      currentSocket.onerror = null
      currentSocket.onclose = null
      currentSocket.close()
    }
    updateConnectionState('idle')
  }, [clearReconnectTimer, updateConnectionState])

  const scheduleReconnect = useCallback((reason) => {
    if (typeof window === 'undefined') return
    if (reconnectTimerRef.current) return
    updateConnectionState('reconnecting')
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      if (enabledRef.current && !tradingFinishedRef.current) {
        connectRef.current?.()
      }
    }, DEFAULT_RECONNECT_DELAY)
  }, [updateConnectionState])

  const connect = useCallback(() => {
    if (!enabledRef.current) {
      return
    }

    const targetStock = stockCodeRef.current
    if (!targetStock) {
      return
    }

    const targetDate = resolvedTradeDate
    if (!targetDate) {
      return
    }

    const url = buildWsUrl(targetStock, targetDate)
    if (!url) {
      return
    }

    closeSocket('准备建立新的连接')
    tradingFinishedRef.current = false
    updateConnectionState('connecting')
    try {
      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        updateConnectionState('connected')
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          console.log(`[TickWS:${targetStock}] 📦 数据`, payload)
          if (typeof payload.tradingFinished === 'boolean') {
            tradingFinishedRef.current = payload.tradingFinished
          }
          applyTickPayload(payload, targetDate)
        } catch (error) {
        }
      }

      socket.onerror = (event) => {
        updateConnectionState('disconnected')
      }

      socket.onclose = (event) => {
        socketRef.current = null
        updateConnectionState(tradingFinishedRef.current ? 'idle' : 'disconnected')
        if (enabledRef.current && !tradingFinishedRef.current) {
          scheduleReconnect('检测到异常关闭')
        }
      }
    } catch (error) {
      scheduleReconnect('连接异常')
    }
  }, [applyTickPayload, closeSocket, resolvedTradeDate, scheduleReconnect, updateConnectionState])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    if (!enabled || !stockCode) {
      closeSocket('流未激活或股票未选择')
      resetState()
      return
    }

    connect()

    return () => {
      closeSocket('依赖变更/组件卸载')
    }
  }, [enabled, stockCode, closeSocket, connect, resetState])

  useEffect(() => {
    if (!stockCode) {
      resetState()
    }
  }, [stockCode, resetState])

  useEffect(() => {
    if (!resolvedTradeDate) {
      return
    }
    setStreamState((prev) => ({
      ...prev,
      tradeDate: resolvedTradeDate,
    }))
  }, [resolvedTradeDate])

  return streamState
}

export default useStockTicksStream
