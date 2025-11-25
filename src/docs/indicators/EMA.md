# EMA (Exponential Moving Average)

指数移动平均线是对移动平均线的改进，对近期价格赋予更大权重，反应更加灵敏。

## 计算方法

EMA(today) = EMA(yesterday) × (N-1)/(N+1) + Price(today) × 2/(N+1)

## 常用周期

- **EMA12**: 12日指数均线，快线
- **EMA26**: 26日指数均线，慢线

## 使用方法

1. **更灵敏**: 比普通MA对价格变化反应更快
2. **MACD基础**: EMA12和EMA26是MACD指标的基础
3. **趋势判断**: 价格在EMA之上为多头，之下为空头
