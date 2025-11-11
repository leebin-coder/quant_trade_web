import { useState, useMemo, useEffect } from 'react'
import { Modal, Segmented } from 'antd'
import { LeftOutlined, RightOutlined, CalendarOutlined, BarChartOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import './CalendarModal.css'

const CalendarModal = ({ visible, onClose, year: initialYear, month: initialMonth, tradingDays, onYearChange }) => {
  const MIN_YEAR = 1990
  const MIN_MONTH = 12
  const currentDate = new Date()
  const MAX_YEAR = currentDate.getFullYear()
  const MAX_MONTH = 12

  const [market, setMarket] = useState('A股') // 股票市场选择
  const [displayType, setDisplayType] = useState('calendar') // calendar | chart
  const [valueType, setValueType] = useState('¥') // ¥ | %
  const [viewMode, setViewMode] = useState('day')
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    // 年视图起始年份，确保不早于1990年
    const currentYear = new Date().getFullYear()
    const idealStart = currentYear - 8
    return Math.max(idealStart, MIN_YEAR)
  })
  const [displayYear, setDisplayYear] = useState(initialYear) // 月视图显示的年份
  const [displayMonth, setDisplayMonth] = useState(initialMonth) // 周/日视图显示的月份

  useEffect(() => {
    setDisplayYear(initialYear)
    setDisplayMonth(initialMonth)
  }, [initialYear, initialMonth])

  // 获取日期的交易状态
  // 返回: { status: 'up' | 'down' | 'hold' | 'closed' | 'future', value: number, percentage: number } | null
  const getTradingStatus = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const tradingDay = tradingDays.find(td => td.tradeDate === dateStr)

    if (!tradingDay) {
      return null // 没有数据，不展示
    }

    // isTradingDay === 0 表示休市
    if (tradingDay.isTradingDay === 0) {
      return {
        status: 'closed',
        value: 0,
        percentage: 0
      }
    }

    // 检查是否为未来的交易日
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)

    if (checkDate > now) {
      return {
        status: 'future',
        value: 0,
        percentage: 0
      }
    }

    // isTradingDay === 1 表示交易日，随机生成涨跌状态和幅度
    // 后续这里会从接口获取真实的涨跌数据
    const random = Math.random()
    let status, value, percentage

    if (random < 0.4) {
      // 涨 40%
      status = 'up'
      value = Math.floor(Math.random() * 300) + 1 // 1-300之间的随机正数
      percentage = (Math.random() * 3).toFixed(2) // 0-3%之间的随机百分比
    } else if (random < 0.8) {
      // 跌 40%
      status = 'down'
      value = -(Math.floor(Math.random() * 300) + 1) // -1到-300之间的随机负数
      percentage = -(Math.random() * 3).toFixed(2) // 0到-3%之间的随机百分比
    } else {
      // 持平 20%
      status = 'hold'
      value = 0
      percentage = 0
    }

    return { status, value, percentage }
  }

  // 检查日期是否为交易日（兼容旧代码）
  const isTradingDay = (date) => {
    const statusData = getTradingStatus(date)
    if (!statusData) return false
    return statusData.status === 'up' || statusData.status === 'down' || statusData.status === 'hold'
  }

  // 检查是否为今天
  const today = new Date()
  const isToday = (date) => {
    return today.getFullYear() === date.getFullYear() &&
           today.getMonth() === date.getMonth() &&
           today.getDate() === date.getDate()
  }

  // 年视图数据 - 展示近9年（3x3），但不超过MAX_YEAR
  const yearViewData = useMemo(() => {
    const years = []
    for (let i = 0; i < 9; i++) {
      const year = yearRangeStart + i

      // 不显示超过当前年的年份
      if (year > MAX_YEAR) break

      // 计算该年的总体涨跌情况
      let totalValue = 0
      let totalPercentage = 0
      let tradingDaysCount = 0

      // 确定该年要计算的月份范围
      const startMonth = (year === MIN_YEAR) ? MIN_MONTH - 1 : 0 // 1990年从12月开始
      const endMonth = 12

      for (let month = startMonth; month < endMonth; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day)
          const statusData = getTradingStatus(date)
          if (statusData && statusData.status !== 'closed') {
            totalValue += statusData.value
            totalPercentage += parseFloat(statusData.percentage)
            tradingDaysCount++
          }
        }
      }

      const avgValue = tradingDaysCount > 0 ? Math.round(totalValue / tradingDaysCount) : 0
      const avgPercentage = tradingDaysCount > 0 ? (totalPercentage / tradingDaysCount).toFixed(2) : '0.00'

      years.push({
        year: year,
        isCurrentYear: year === today.getFullYear(),
        value: avgValue,
        percentage: avgPercentage,
        status: avgValue > 0 ? 'up' : avgValue < 0 ? 'down' : 'hold'
      })
    }
    return years
  }, [yearRangeStart, tradingDays])

  // 月视图数据 - 展示当年的月份（默认到当前月），1990年只显示12月
  const monthViewData = useMemo(() => {
    const months = []
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // 确定月份范围
    let minMonth = 1
    let maxMonth = 12

    // 1990年只显示12月
    if (displayYear === MIN_YEAR) {
      minMonth = MIN_MONTH
    }

    // 当前年份只显示到当前月（或12月）
    if (displayYear === currentYear && currentMonth < 12) {
      maxMonth = currentMonth
    }

    for (let m = minMonth; m <= maxMonth; m++) {
      // 计算该月的总体涨跌情况
      let totalValue = 0
      let totalPercentage = 0
      let tradingDaysCount = 0

      const daysInMonth = new Date(displayYear, m, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(displayYear, m - 1, day)
        const statusData = getTradingStatus(date)
        if (statusData && statusData.status !== 'closed') {
          totalValue += statusData.value
          totalPercentage += parseFloat(statusData.percentage)
          tradingDaysCount++
        }
      }

      const avgValue = tradingDaysCount > 0 ? Math.round(totalValue / tradingDaysCount) : 0
      const avgPercentage = tradingDaysCount > 0 ? (totalPercentage / tradingDaysCount).toFixed(2) : '0.00'

      months.push({
        month: m,
        monthName: `${m}月`,
        isCurrentMonth: displayYear === currentYear && m === currentMonth,
        value: avgValue,
        percentage: avgPercentage,
        status: avgValue > 0 ? 'up' : avgValue < 0 ? 'down' : 'hold'
      })
    }
    return months
  }, [displayYear, tradingDays])

  // 获取某月的所有周（包含该月任意一天的周）
  const getMonthWeeks = (year, month) => {
    const weeks = []
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)

    // 获取第一天所在周的周一
    let currentDate = new Date(firstDay)
    currentDate.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1))

    // 遍历所有周，直到超出当月最后一天
    while (currentDate <= lastDay || currentDate.getMonth() === month - 1) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart)
        date.setDate(date.getDate() + i)
        return {
          date: date,
          statusData: getTradingStatus(date)
        }
      })

      // 计算该周的总体涨跌情况
      let totalValue = 0
      let totalPercentage = 0
      let tradingDaysCount = 0

      dates.forEach(({ statusData }) => {
        if (statusData && statusData.status !== 'closed') {
          totalValue += statusData.value
          totalPercentage += parseFloat(statusData.percentage)
          tradingDaysCount++
        }
      })

      const avgValue = tradingDaysCount > 0 ? Math.round(totalValue / tradingDaysCount) : 0
      const avgPercentage = tradingDaysCount > 0 ? (totalPercentage / tradingDaysCount).toFixed(2) : '0.00'

      weeks.push({
        weekStart: new Date(weekStart),
        weekEnd: new Date(weekEnd),
        dates: dates,
        value: avgValue,
        percentage: avgPercentage,
        status: avgValue > 0 ? 'up' : avgValue < 0 ? 'down' : 'hold'
      })

      currentDate.setDate(currentDate.getDate() + 7)

      // 如果下一周的周一已经超出当月，则停止
      if (currentDate.getMonth() > month - 1 && currentDate > lastDay) {
        break
      }
    }

    return weeks
  }

  // 周视图数据 - 展示当前月的所有周（2行3列，最多6周）
  const weekViewData = useMemo(() => {
    return getMonthWeeks(displayYear, displayMonth)
  }, [displayYear, displayMonth, tradingDays])

  // 日视图数据 - 展示当前月的所有天
  const dayViewData = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth - 1, 1)
    const lastDay = new Date(displayYear, displayMonth, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekDay = firstDay.getDay()

    const days = []

    // 填充前面的空白（上个月的日期）
    for (let i = 0; i < startWeekDay; i++) {
      days.push(null)
    }

    // 填充当月日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(displayYear, displayMonth - 1, i)
      const statusData = getTradingStatus(date)
      days.push({
        day: i,
        date: date,
        statusData: statusData,
        isToday: isToday(date)
      })
    }

    return days
  }, [displayYear, displayMonth, tradingDays])

  // 导航处理
  const handlePrev = () => {
    if (viewMode === 'year') {
      const newYearStart = Math.max(yearRangeStart - 9, MIN_YEAR)
      if (newYearStart !== yearRangeStart) {
        setYearRangeStart(newYearStart)
        onYearChange(newYearStart)
      }
    } else if (viewMode === 'month') {
      const newYear = displayYear - 1
      if (newYear >= MIN_YEAR) {
        setDisplayYear(newYear)
        onYearChange(newYear)
      }
    } else if (viewMode === 'week' || viewMode === 'day') {
      // 处理周/日视图的上一个月
      if (displayMonth === 1) {
        const newYear = displayYear - 1
        if (newYear >= MIN_YEAR) {
          setDisplayYear(newYear)
          setDisplayMonth(12)
          onYearChange(newYear)
        }
      } else if (displayMonth === MIN_MONTH && displayYear === MIN_YEAR) {
        // 如果已经是1990年12月，不能再往前
        return
      } else {
        const newMonth = displayMonth - 1
        // 1990年不能显示12月之前的月份
        if (displayYear === MIN_YEAR && newMonth < MIN_MONTH) {
          return
        }
        setDisplayMonth(newMonth)
      }
    }
  }

  const handleNext = () => {
    if (viewMode === 'year') {
      const newYearStart = yearRangeStart + 9
      // 确保不超过当前年
      if (newYearStart <= MAX_YEAR) {
        setYearRangeStart(newYearStart)
        onYearChange(Math.min(newYearStart + 8, MAX_YEAR))
      }
    } else if (viewMode === 'month') {
      const newYear = displayYear + 1
      if (newYear <= MAX_YEAR) {
        setDisplayYear(newYear)
        onYearChange(newYear)
      }
    } else if (viewMode === 'week' || viewMode === 'day') {
      if (displayMonth === 12) {
        const newYear = displayYear + 1
        if (newYear <= MAX_YEAR) {
          setDisplayYear(newYear)
          setDisplayMonth(1)
          onYearChange(newYear)
        }
      } else {
        setDisplayMonth(displayMonth + 1)
      }
    }
  }

  const handleCurrent = () => {
    const now = new Date()
    const todayYear = now.getFullYear()
    const todayMonth = now.getMonth() + 1

    // 回到当前时间，并保持在当前视图
    if (viewMode === 'year') {
      const newYearStart = Math.max(todayYear - 8, MIN_YEAR)
      setYearRangeStart(newYearStart)
    } else if (viewMode === 'month') {
      setDisplayYear(todayYear)
    } else if (viewMode === 'week' || viewMode === 'day') {
      setDisplayYear(todayYear)
      setDisplayMonth(todayMonth)
    }

    if (todayYear !== displayYear) {
      onYearChange(todayYear)
    }
  }

  // 获取标题文本
  const getTitleText = () => {
    if (viewMode === 'year') {
      const endYear = Math.min(yearRangeStart + 8, MAX_YEAR)
      return `${yearRangeStart}年 - ${endYear}年`
    } else if (viewMode === 'month') {
      return `${displayYear}年`
    } else if (viewMode === 'week') {
      return `${displayYear}年${displayMonth}月`
    } else {
      return `${displayYear}年${displayMonth}月`
    }
  }

  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  // 生成ECharts配置
  const getChartOption = useMemo(() => {
    const chartData = dayViewData.filter(d => d && d.statusData && d.statusData.status !== 'closed')

    const xData = chartData.map(d => d.day)
    const yData = chartData.map(d => {
      const { value, percentage } = d.statusData
      return valueType === '¥' ? value : parseFloat(percentage)
    })

    return {
      grid: {
        left: '3%',
        right: '3%',
        top: '10%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: {
          show: true,
          lineStyle: {
            color: '#bdbdbd',
            type: 'dashed'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 11,
          fontWeight: 500
        }
      },
      yAxis: {
        type: 'value',
        show: false,
        splitLine: {
          show: false
        }
      },
      series: [{
        type: 'line',
        data: yData,
        smooth: true,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#66bb6a' },
              { offset: 0.5, color: '#1976d2' },
              { offset: 1, color: '#ef5350' }
            ]
          }
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 83, 80, 0.3)' },
              { offset: 0.5, color: 'rgba(25, 118, 210, 0.2)' },
              { offset: 1, color: 'rgba(102, 187, 106, 0.3)' }
            ]
          }
        },
        itemStyle: {
          color: (params) => params.value > 0 ? '#ef5350' : params.value < 0 ? '#66bb6a' : '#9e9e9e',
          borderWidth: 2,
          borderColor: '#fff'
        },
        symbol: 'circle',
        symbolSize: 6,
        label: {
          show: true,
          position: (params) => params.value >= 0 ? 'top' : 'bottom',
          formatter: (params) => {
            if (params.value === 0) return ''
            const displayVal = valueType === '¥'
              ? (params.value > 0 ? `+${params.value}` : params.value)
              : (params.value > 0 ? `+${params.value}%` : `${params.value}%`)
            return displayVal
          },
          color: (params) => params.value > 0 ? '#d32f2f' : '#388e3c',
          fontSize: 10,
          fontWeight: 600
        }
      }]
    }
  }, [dayViewData, valueType])

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      closable={false}
      className="trading-calendar-modal"
    >
      <div className="calendar-modal-content">
        <div className="calendar-modal-header">
          {/* 第一行：股票市场选择 */}
          <div className="header-row header-row-market">
            <Segmented
              value={market}
              onChange={setMarket}
              options={[
                { label: 'A股', value: 'A股' },
                { label: '港股', value: '港股', disabled: true },
                { label: '美股', value: '美股', disabled: true }
              ]}
              className="market-selector"
            />
          </div>

          {/* 第二行：日历/图表切换 | 时间范围导航 | 视图切换 | ¥/% 切换 */}
          <div className="header-row header-row-controls">
            {/* 左侧：日历/图表切换 */}
            <Segmented
              value={displayType}
              onChange={setDisplayType}
              options={[
                { label: <CalendarOutlined />, value: 'calendar' },
                { label: <BarChartOutlined />, value: 'chart' }
              ]}
              className="control-segment"
            />

            {/* 中间：时间范围导航 */}
            <div className="calendar-nav">
              <button className="calendar-nav-btn" onClick={handlePrev} title="上一个">
                <LeftOutlined />
              </button>
              <div className="calendar-title">
                {getTitleText()}
              </div>
              <button className="calendar-nav-btn" onClick={handleNext} title="下一个">
                <RightOutlined />
              </button>
            </div>

            {/* 右侧区域：视图切换 + ¥/% 切换 */}
            <div className="right-controls">
              {/* 视图切换 */}
              <Segmented
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { label: '年', value: 'year' },
                  { label: '月', value: 'month' },
                  { label: '周', value: 'week' },
                  { label: '日', value: 'day' }
                ]}
                className="control-segment view-selector"
              />

              {/* ¥/% 切换 */}
              <Segmented
                value={valueType}
                onChange={setValueType}
                options={[
                  { label: '¥', value: '¥' },
                  { label: '%', value: '%' }
                ]}
                className="control-segment value-selector"
              />
            </div>
          </div>
        </div>

        {/* 图表视图 */}
        {displayType === 'chart' && (
          <div className="calendar-view-container">
            <ReactECharts
              option={getChartOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}

        {/* 年视图 - 3x3展示9年 */}
        {displayType === 'calendar' && viewMode === 'year' && (
          <div className="calendar-view-container">
            <div className="calendar-year-view">
              {yearViewData.map((yearData) => (
                <div
                  key={yearData.year}
                  className={`year-card status-${yearData.status} ${yearData.isCurrentYear ? 'current-year' : ''}`}
                  onClick={() => {
                    setDisplayYear(yearData.year)
                    setViewMode('month')
                  }}
                >
                  <div className="card-time">{yearData.year}年</div>
                  <div className={`card-change status-${yearData.status}`}>
                    {valueType === '¥' ? (
                      <>
                        {yearData.status === 'up' && `+${yearData.value}`}
                        {yearData.status === 'down' && `${yearData.value}`}
                        {yearData.status === 'hold' && `${yearData.value}`}
                      </>
                    ) : (
                      <>
                        {yearData.status === 'up' && `+${yearData.percentage}%`}
                        {yearData.status === 'down' && `${yearData.percentage}%`}
                        {yearData.status === 'hold' && `${yearData.percentage}%`}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 月视图 - 3x4展示月份 */}
        {displayType === 'calendar' && viewMode === 'month' && (
          <div className="calendar-view-container">
            <div className="calendar-month-view">
              {monthViewData.map((monthData) => (
                <div
                  key={monthData.month}
                  className={`month-card status-${monthData.status} ${monthData.isCurrentMonth ? 'current-month' : ''}`}
                  onClick={() => {
                    setDisplayMonth(monthData.month)
                    setViewMode('week')
                  }}
                >
                  <div className="card-time">{monthData.monthName}</div>
                  <div className={`card-change status-${monthData.status}`}>
                    {valueType === '¥' ? (
                      <>
                        {monthData.status === 'up' && `+${monthData.value}`}
                        {monthData.status === 'down' && `${monthData.value}`}
                        {monthData.status === 'hold' && `${monthData.value}`}
                      </>
                    ) : (
                      <>
                        {monthData.status === 'up' && `+${monthData.percentage}%`}
                        {monthData.status === 'down' && `${monthData.percentage}%`}
                        {monthData.status === 'hold' && `${monthData.percentage}%`}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 周视图 - 2x3展示周 */}
        {displayType === 'calendar' && viewMode === 'week' && (
          <div className="calendar-view-container">
            <div className="calendar-week-view">
              {weekViewData.map((weekData, index) => (
                <div
                  key={index}
                  className={`week-card status-${weekData.status}`}
                  onClick={() => {
                    setViewMode('day')
                  }}
                >
                  <div className="week-header">
                    <div className="week-time-row">
                      <div className="card-time">
                        {`${weekData.weekStart.getMonth() + 1}/${weekData.weekStart.getDate()} - ${weekData.weekEnd.getMonth() + 1}/${weekData.weekEnd.getDate()}`}
                      </div>
                      <div className={`card-change status-${weekData.status}`}>
                        {valueType === '¥' ? (
                          <>
                            {weekData.status === 'up' && `+${weekData.value}`}
                            {weekData.status === 'down' && `${weekData.value}`}
                            {weekData.status === 'hold' && `${weekData.value}`}
                          </>
                        ) : (
                          <>
                            {weekData.status === 'up' && `+${weekData.percentage}%`}
                            {weekData.status === 'down' && `${weekData.percentage}%`}
                            {weekData.status === 'hold' && `${weekData.percentage}%`}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 日视图 - 展示当月所有天 */}
        {displayType === 'calendar' && viewMode === 'day' && (
          <div className="calendar-view-container">
            <div className="calendar-modal-weekdays">
              {weekDays.map((day, index) => (
                <div key={index} className="calendar-modal-weekday">
                  {day}
                </div>
              ))}
            </div>
            <div className="calendar-modal-days">
              {dayViewData.map((dayData, index) => {
                if (!dayData) {
                  return <div key={index} className="calendar-modal-day empty"></div>
                }
                if (!dayData.statusData) {
                  return null // 没有数据，不展示
                }

                const { status, value, percentage } = dayData.statusData

                return (
                  <div
                    key={index}
                    className={`calendar-modal-day status-${status} ${
                      dayData.isToday ? 'today' : ''
                    }`}
                  >
                    <div className="card-time">{dayData.day}</div>
                    <div className={`card-change status-${status}`}>
                      {status === 'closed' ? '休市' : status === 'future' ? '' : (
                        valueType === '¥' ? (
                          <>
                            {status === 'up' && `+${value}`}
                            {status === 'down' && `${value}`}
                            {status === 'hold' && `${value}`}
                          </>
                        ) : (
                          <>
                            {status === 'up' && `+${percentage}%`}
                            {status === 'down' && `${percentage}%`}
                            {status === 'hold' && `${percentage}%`}
                          </>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default CalendarModal
