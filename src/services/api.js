import axios from 'axios'
import { message } from 'antd'

// 创建axios实例 - 用于业务接口（带 /api 前缀）
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 创建axios实例 - 用于认证接口（不带 /api 前缀）
const authApi = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等认证信息
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 通用错误处理函数
const responseErrorHandler = (error) => {
  if (error.response) {
    const { status, data } = error.response
    switch (status) {
      case 401:
        message.error('登录已过期，请重新登录')
        // 清除登录信息
        localStorage.removeItem('token')
        localStorage.removeItem('userId')
        localStorage.removeItem('nickName')
        // 跳转到登录页
        window.location.href = '/login'
        break
      case 403:
        message.error('拒绝访问')
        break
      case 404:
        message.error('请求资源不存在')
        break
      case 500:
        message.error('服务器错误')
        break
      default:
        message.error(data.message || '请求失败')
    }
  } else {
    message.error('网络错误,请检查网络连接')
  }
  return Promise.reject(error)
}

// 响应拦截器 - 业务接口
api.interceptors.response.use(
  (response) => {
    const { data } = response
    return data
  },
  responseErrorHandler
)

// 响应拦截器 - 认证接口
authApi.interceptors.response.use(
  (response) => {
    const { data } = response
    return data
  },
  responseErrorHandler
)

// API接口定义
// 认证相关接口（不使用 /api 前缀）
export const authAPI = {
  // 发送验证码
  sendCode: (phone) => authApi.post('/api/auth/send-code', { phone }),
  // 登录
  login: (phone, code) => authApi.post('/api/auth/login', { phone, code }),
}

export const dashboardAPI = {
  // 获取仪表盘数据
  getDashboardData: () => api.get('/dashboard'),
  // 获取账户信息
  getAccountInfo: () => api.get('/account/info'),
  // 获取持仓列表
  getPositions: () => api.get('/positions'),
}

export const marketAPI = {
  // 获取实时行情
  getRealtimeQuotes: (params) => api.get('/market/realtime', { params }),
  // 获取K线数据
  getKlineData: (symbol, interval) =>
    api.get(`/market/kline/${symbol}`, { params: { interval } }),
  // 搜索股票
  searchStock: (keyword) => api.get('/market/search', { params: { keyword } }),
}

export const strategyAPI = {
  // 获取策略列表
  getStrategyList: () => api.get('/strategies'),
  // 创建策略
  createStrategy: (data) => api.post('/strategies', data),
  // 更新策略
  updateStrategy: (id, data) => api.put(`/strategies/${id}`, data),
  // 删除策略
  deleteStrategy: (id) => api.delete(`/strategies/${id}`),
  // 启动策略
  startStrategy: (id) => api.post(`/strategies/${id}/start`),
  // 停止策略
  stopStrategy: (id) => api.post(`/strategies/${id}/stop`),
  // 获取策略详情
  getStrategyDetail: (id) => api.get(`/strategies/${id}`),
}

export const tradeAPI = {
  // 获取交易记录
  getTradeHistory: (params) => api.get('/trades', { params }),
  // 获取交易统计
  getTradeStatistics: (params) => api.get('/trades/statistics', { params }),
  // 手动下单
  placeOrder: (data) => api.post('/trades/order', data),
}

export const tradingCalendarAPI = {
  // 获取指定年份的交易日历
  getTradingCalendarByYear: (year) => api.get(`/trading-calendar/year/${year}`),
}

export const stockDailyAPI = {
  // 查询股票日线数据
  // params: { stockCode, startDate, endDate, sortOrder, adjustFlag }
  // adjustFlag: 1-后复权, 2-前复权, 3-不复权 (默认为3)
  queryStockDaily: (params) => api.post('/stock-daily/query', params),
}

export const stockRelationAPI = {
  // 获取当前用户关注的股票列表
  getFollowedStocks: (params) => api.get('/stock-relations/followed-stocks', { params }),
  // 添加关注
  followStock: (stockCode) => api.post('/stock-relations/follow', { stockCode }),
  // 取消关注
  unfollowStock: (stockCode) => api.delete('/stock-relations/follow', { params: { stockCode } }),
}

export const stockCompanyAPI = {
  // 获取公司详情
  getCompanyDetail: (stockCode) => api.get(`/stock-companies/${stockCode}`),
}

export default api
