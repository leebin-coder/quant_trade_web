import { useEffect, useState } from 'react'
import { tradingCalendarAPI } from '../services/api'
import {
  getTradingSessionInfo,
  updateTradingSessionFromCalendar,
  tradingSessionHasHistoryBeforeToday,
} from '../utils/tradingSession'

const calendarCache = new Map()

const fetchCalendarByYear = async (year) => {
  if (calendarCache.has(year)) {
    return calendarCache.get(year)
  }
  const response = await tradingCalendarAPI.getTradingCalendarByYear(year)
  const result = response?.data || []
  calendarCache.set(year, result)
  return result
}

const ensureCalendarData = async () => {
  const now = new Date()
  const currentYear = now.getFullYear()
  let combined = await fetchCalendarByYear(currentYear)
  if (!tradingSessionHasHistoryBeforeToday(combined, now)) {
    const previousYear = currentYear - 1
    if (previousYear >= 1900) {
      const prevData = await fetchCalendarByYear(previousYear)
      combined = [...prevData, ...combined]
    }
  }
  return combined
}

export const useTradingSession = () => {
  const initialInfo = getTradingSessionInfo()
  const [state, setState] = useState(() => ({
    ...initialInfo,
    loading: !initialInfo.initialized,
  }))

  useEffect(() => {
    let mounted = true

    const resolveCalendar = async () => {
      try {
        const calendar = await ensureCalendarData()
        const updated = updateTradingSessionFromCalendar(calendar)
        if (mounted) {
          setState({
            ...updated,
            loading: false,
          })
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
          }))
        }
        console.error('获取交易日历失败:', error)
      }
    }

    if (!initialInfo.initialized) {
      resolveCalendar()
    } else {
      setState(prev => ({
        ...prev,
        ...initialInfo,
        loading: false,
      }))
    }

    const handleSessionUpdate = () => {
      if (!mounted) return
      setState(prev => ({
        ...prev,
        ...getTradingSessionInfo(),
        loading: false,
      }))
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('trading-session-update', handleSessionUpdate)
    }

    return () => {
      mounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('trading-session-update', handleSessionUpdate)
      }
    }
  }, [initialInfo.initialized])

  return state
}

export default useTradingSession
