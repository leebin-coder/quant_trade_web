import dayjs from 'dayjs'

/**
 * 格式化数字为货币格式
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数
 * @returns {string}
 */
export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-'
  return `¥${Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/**
 * 格式化百分比
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数
 * @returns {string}
 */
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(decimals)}%`
}

/**
 * 格式化大数字（万、亿）
 * @param {number} value - 数值
 * @returns {string}
 */
export const formatLargeNumber = (value) => {
  if (value === null || value === undefined) return '-'
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`
  } else if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`
  }
  return value.toFixed(2)
}

/**
 * 格式化日期时间
 * @param {string|Date} date - 日期
 * @param {string} format - 格式
 * @returns {string}
 */
export const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '-'
  return dayjs(date).format(format)
}

/**
 * 格式化相对时间
 * @param {string|Date} date - 日期
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
  if (!date) return '-'
  const now = dayjs()
  const target = dayjs(date)
  const diffMinutes = now.diff(target, 'minute')
  const diffHours = now.diff(target, 'hour')
  const diffDays = now.diff(target, 'day')

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return target.format('YYYY-MM-DD')
}

/**
 * 获取涨跌颜色
 * @param {number} value - 数值
 * @returns {string}
 */
export const getChangeColor = (value) => {
  if (value > 0) return '#f5222d' // 红色（涨）
  if (value < 0) return '#52c41a' // 绿色（跌）
  return '#666' // 灰色（平）
}

/**
 * 生成随机颜色
 * @returns {string}
 */
export const getRandomColor = () => {
  const colors = [
    '#1890ff',
    '#52c41a',
    '#faad14',
    '#f5222d',
    '#722ed1',
    '#13c2c2',
    '#eb2f96',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * 深拷贝对象
 * @param {*} obj - 对象
 * @returns {*}
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 防抖函数
 * @param {Function} func - 函数
 * @param {number} wait - 等待时间
 * @returns {Function}
 */
export const debounce = (func, wait = 300) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 * @param {Function} func - 函数
 * @param {number} wait - 等待时间
 * @returns {Function}
 */
export const throttle = (func, wait = 300) => {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), wait)
    }
  }
}
