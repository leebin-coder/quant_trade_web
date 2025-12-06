import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_RECONNECT_DELAY = 3000
const DEFAULT_PORT = '8080'
const DEFAULT_PATH = '/ws/ticks'

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
  const port = rawPort === '' ? '' : (rawPort || DEFAULT_PORT)
  const path = env.VITE_QUANT_GATEWAY_WS_PATH || env.VITE_QUANT_MARKET_WS_PATH || DEFAULT_PATH

  if (!host) {
    console.warn('[TickWS] 缺少 quant-gateway 域名，无法建立连接')
    return null
  }

  return {
    protocol,
    host,
    port,
    path,
  }
}

const buildWsUrl = (stockCode) => {
  if (!stockCode) return null
  const envConfig = resolveEnv()
  if (!envConfig) return null

  const { protocol, host, port, path } = envConfig
  const portSegment = port ? `:${port}` : ''

  return `${protocol}://${host}${portSegment}${path}?stockCode=${encodeURIComponent(stockCode)}`
}

export function useStockTicksStream({ stockCode, enabled }) {
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const stockCodeRef = useRef(stockCode)
  const enabledRef = useRef(enabled)
  const tradingFinishedRef = useRef(false)
  const connectRef = useRef(null)

  useEffect(() => {
    stockCodeRef.current = stockCode
  }, [stockCode])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

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
      try {
        currentSocket.onopen = null
        currentSocket.onmessage = null
        currentSocket.onerror = null
        currentSocket.onclose = null
        currentSocket.close()
      } catch (error) {
        console.warn(`[TickWS:${stockCodeRef.current || 'N/A'}] 关闭连接出错`, error)
      }
      console.log(`[TickWS:${stockCodeRef.current || 'N/A'}] 🔚 ${label}`)
    }
  }, [clearReconnectTimer])

  const scheduleReconnect = useCallback((reason) => {
    if (typeof window === 'undefined') return
    if (reconnectTimerRef.current) return
    console.log(
      `[TickWS:${stockCodeRef.current || 'N/A'}] ♻️ ${reason}，${
        DEFAULT_RECONNECT_DELAY
      }ms 后尝试重连`
    )
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null
      if (enabledRef.current && !tradingFinishedRef.current) {
        connectRef.current?.()
      } else {
        console.log(
          `[TickWS:${stockCodeRef.current || 'N/A'}] ⏹️ 已停止重连 enabled=${enabledRef.current} tradingFinished=${tradingFinishedRef.current}`
        )
      }
    }, DEFAULT_RECONNECT_DELAY)
  }, [])

  const connect = useCallback(() => {
    if (!enabledRef.current) {
      return
    }

    const targetStock = stockCodeRef.current
    if (!targetStock) {
      return
    }

    const url = buildWsUrl(targetStock)
    if (!url) {
      return
    }

    closeSocket('准备建立新的连接')
    tradingFinishedRef.current = false
    console.log(`[TickWS:${targetStock}] 🔌 准备连接 gateway -> ${url}`)

    try {
      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        console.log(`[TickWS:${targetStock}] ✅ 握手成功，等待推送`)
      }

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (typeof payload.tradingFinished === 'boolean') {
            tradingFinishedRef.current = payload.tradingFinished
          }
          const summary = {
            type: payload.type,
            phase: payload.phase,
            message: payload.message,
            tradingDate: payload.tradingDate,
            tradingFinished: payload.tradingFinished,
            ticksCount: Array.isArray(payload.ticks) ? payload.ticks.length : 0,
            hasLastTick: Boolean(payload.tick),
          }
          console.log(`[TickWS:${targetStock}] 📩 收到 ${payload.type || 'UNKNOWN'} 消息`, summary)
          if (payload.tick) {
            console.log(`[TickWS:${targetStock}] 📈 最新tick`, payload.tick)
          }
          if (payload.type === 'ERROR') {
            console.error(`[TickWS:${targetStock}] ❌ 服务端异常`, payload.message)
          }
        } catch (error) {
          console.error(`[TickWS:${targetStock}] 🔄 解析消息失败`, error)
        }
      }

      socket.onerror = (event) => {
        console.error(`[TickWS:${targetStock}] ⚠️ WebSocket 错误`, event)
      }

      socket.onclose = (event) => {
        socketRef.current = null
        console.log(
          `[TickWS:${targetStock}] 🔒 连接关闭 code=${event.code} reason=${event.reason ||
            '无'} wasClean=${event.wasClean}`
        )
        if (enabledRef.current && !tradingFinishedRef.current) {
          scheduleReconnect('检测到异常关闭')
        } else if (tradingFinishedRef.current) {
          console.log(`[TickWS:${targetStock}] 📆 当日交易结束，服务端已主动关闭连接`)
        }
      }
    } catch (error) {
      console.error(`[TickWS:${targetStock}] ❌ 建立 WebSocket 失败`, error)
      scheduleReconnect('连接异常')
    }
  }, [closeSocket, scheduleReconnect])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    if (!enabled || !stockCode) {
      closeSocket('流未激活或股票未选择')
      return
    }

    connect()

    return () => {
      closeSocket('依赖变更/组件卸载')
    }
  }, [enabled, stockCode, closeSocket, connect])
}

export default useStockTicksStream
