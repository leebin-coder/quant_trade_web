const formatDate = (date) => {
  if (!(date instanceof Date)) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultState = {
  initialized: false,
  todayDate: null,
  isTodayTradingDay: null,
  previousTradingDate: null,
  effectiveTradingDate: null,
  tradingDaysLoaded: false,
  lastUpdated: null,
}

let tradingSessionState = {
  ...defaultState,
}

const emitUpdate = () => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('trading-session-update', {
        detail: tradingSessionState,
      })
    )
  }
}

const normalizeTradingDays = (tradingDays = []) => {
  if (!Array.isArray(tradingDays)) return []
  return tradingDays.filter(item => item && item.tradeDate).slice().sort((a, b) => {
    if (a.tradeDate === b.tradeDate) return 0
    return a.tradeDate > b.tradeDate ? 1 : -1
  })
}

const findPreviousTradingDate = (sortedTradingDays, targetDate) => {
  if (!sortedTradingDays.length || !targetDate) {
    return null
  }
  let previous = null
  for (const day of sortedTradingDays) {
    if (day.tradeDate < targetDate) {
      if (day.isTradingDay === 1) {
        previous = day.tradeDate
      }
    } else if (day.tradeDate >= targetDate) {
      break
    }
  }
  return previous
}

const hasTradingDayBefore = (sortedTradingDays, targetDate) => {
  if (!sortedTradingDays.length || !targetDate) return false
  return sortedTradingDays.some(day => day.isTradingDay === 1 && day.tradeDate < targetDate)
}

export const deriveTradingSessionInfo = (tradingDays = [], now = new Date()) => {
  const todayDate = formatDate(now)
  const sortedTradingDays = normalizeTradingDays(tradingDays)
  const tradingDaySet = new Set(sortedTradingDays.filter(day => day.isTradingDay === 1).map(day => day.tradeDate))
  const isTodayTradingDay = tradingDaySet.has(todayDate)
  const previousTradingDate = findPreviousTradingDate(sortedTradingDays, todayDate)

  const hour = now.getHours()
  const beforeNine = hour < 9
  let effectiveTradingDate = todayDate

  if (!isTodayTradingDay) {
    effectiveTradingDate = previousTradingDate || todayDate
  } else if (beforeNine) {
    effectiveTradingDate = previousTradingDate || todayDate
  }

  return {
    todayDate,
    isTodayTradingDay,
    previousTradingDate,
    effectiveTradingDate,
    tradingDaysLoaded: sortedTradingDays.length > 0,
  }
}

export const updateTradingSessionFromCalendar = (tradingDays = [], now = new Date()) => {
  const derived = deriveTradingSessionInfo(tradingDays, now)
  tradingSessionState = {
    ...tradingSessionState,
    ...derived,
    initialized: true,
    lastUpdated: Date.now(),
  }
  emitUpdate()
  return tradingSessionState
}

export const setEffectiveTradingDate = (effectiveTradingDate) => {
  tradingSessionState = {
    ...tradingSessionState,
    effectiveTradingDate,
    lastUpdated: Date.now(),
    initialized: true,
  }
  emitUpdate()
  return tradingSessionState
}

export const getTradingSessionInfo = () => ({
  ...tradingSessionState,
})

export const getEffectiveTradingDate = (fallback = new Date()) => {
  if (tradingSessionState.effectiveTradingDate) {
    return tradingSessionState.effectiveTradingDate
  }
  return formatDate(fallback)
}

export const tradingSessionHasHistoryBeforeToday = (tradingDays = [], now = new Date()) => {
  const todayDate = formatDate(now)
  const sorted = normalizeTradingDays(tradingDays)
  return hasTradingDayBefore(sorted, todayDate)
}

export { formatDate }
