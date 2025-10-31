// 策略类型
export const STRATEGY_TYPES = {
  TREND: 'trend',
  MEAN: 'mean',
  MOMENTUM: 'momentum',
  GRID: 'grid',
}

export const STRATEGY_TYPE_LABELS = {
  [STRATEGY_TYPES.TREND]: '趋势跟踪',
  [STRATEGY_TYPES.MEAN]: '均值回归',
  [STRATEGY_TYPES.MOMENTUM]: '动量交易',
  [STRATEGY_TYPES.GRID]: '网格交易',
}

// 策略状态
export const STRATEGY_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  PAUSED: 'paused',
}

export const STRATEGY_STATUS_LABELS = {
  [STRATEGY_STATUS.RUNNING]: '运行中',
  [STRATEGY_STATUS.STOPPED]: '已停止',
  [STRATEGY_STATUS.PAUSED]: '已暂停',
}

// 交易方向
export const TRADE_DIRECTION = {
  BUY: 'buy',
  SELL: 'sell',
}

export const TRADE_DIRECTION_LABELS = {
  [TRADE_DIRECTION.BUY]: '买入',
  [TRADE_DIRECTION.SELL]: '卖出',
}

// 订单状态
export const ORDER_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
}

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: '待成交',
  [ORDER_STATUS.PARTIAL]: '部分成交',
  [ORDER_STATUS.FILLED]: '已成交',
  [ORDER_STATUS.CANCELLED]: '已撤销',
  [ORDER_STATUS.REJECTED]: '已拒绝',
}

// K线周期
export const KLINE_INTERVALS = {
  '1MIN': '1min',
  '5MIN': '5min',
  '15MIN': '15min',
  '30MIN': '30min',
  '1HOUR': '1hour',
  '1DAY': '1day',
  '1WEEK': '1week',
  '1MONTH': '1month',
}

export const KLINE_INTERVAL_LABELS = {
  [KLINE_INTERVALS['1MIN']]: '1分钟',
  [KLINE_INTERVALS['5MIN']]: '5分钟',
  [KLINE_INTERVALS['15MIN']]: '15分钟',
  [KLINE_INTERVALS['30MIN']]: '30分钟',
  [KLINE_INTERVALS['1HOUR']]: '1小时',
  [KLINE_INTERVALS['1DAY']]: '日线',
  [KLINE_INTERVALS['1WEEK']]: '周线',
  [KLINE_INTERVALS['1MONTH']]: '月线',
}

// 市场板块
export const MARKET_SECTORS = {
  ALL: 'all',
  TECH: 'tech',
  FINANCE: 'finance',
  CONSUME: 'consume',
  MEDICAL: 'medical',
  INDUSTRY: 'industry',
  ESTATE: 'estate',
}

export const MARKET_SECTOR_LABELS = {
  [MARKET_SECTORS.ALL]: '全部板块',
  [MARKET_SECTORS.TECH]: '科技股',
  [MARKET_SECTORS.FINANCE]: '金融股',
  [MARKET_SECTORS.CONSUME]: '消费股',
  [MARKET_SECTORS.MEDICAL]: '医药股',
  [MARKET_SECTORS.INDUSTRY]: '工业股',
  [MARKET_SECTORS.ESTATE]: '地产股',
}

// WebSocket消息类型
export const WS_MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  REALTIME_QUOTE: 'realtime_quote',
  TRADE_SIGNAL: 'trade_signal',
  ORDER_UPDATE: 'order_update',
  POSITION_UPDATE: 'position_update',
}

// 默认配置
export const DEFAULT_CONFIG = {
  PAGE_SIZE: 10,
  CHART_HEIGHT: 400,
  REFRESH_INTERVAL: 5000, // 5秒
  API_TIMEOUT: 10000, // 10秒
}
