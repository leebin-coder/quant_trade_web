import { useMemo } from 'react'
import './MiniCalendar.css'

const MiniCalendar = ({ year, month, tradingDays }) => {
  // 获取当月的日历数据
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekDay = firstDay.getDay() // 0-6, 0是周日

    const days = []

    // 填充前面的空白
    for (let i = 0; i < startWeekDay; i++) {
      days.push(null)
    }

    // 填充当月日期
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const tradingDay = tradingDays.find(td => td.tradeDate === dateStr)
      days.push({
        day: i,
        date: dateStr,
        isTradingDay: tradingDay ? tradingDay.isTradingDay === 1 : false
      })
    }

    return days
  }, [year, month, tradingDays])

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // 获取今天的日期
  const today = new Date()
  const isToday = (day) => {
    return today.getFullYear() === year &&
           today.getMonth() + 1 === month &&
           today.getDate() === day
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        {year}年{month}月
      </div>
      <div className="mini-calendar-weekdays">
        {weekDays.map((day, index) => (
          <div key={index} className="mini-calendar-weekday">
            {day}
          </div>
        ))}
      </div>
      <div className="mini-calendar-days">
        {calendarData.map((dayData, index) => (
          <div
            key={index}
            className={`mini-calendar-day ${
              dayData ? (dayData.isTradingDay ? 'trading-day' : 'non-trading-day') : 'empty'
            } ${dayData && isToday(dayData.day) ? 'today' : ''}`}
          >
            {dayData ? dayData.day : ''}
          </div>
        ))}
      </div>
      <div className="mini-calendar-legend">
        <div className="legend-item">
          <span className="legend-dot trading"></span>
          <span className="legend-text">交易日</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot non-trading"></span>
          <span className="legend-text">休市</span>
        </div>
      </div>
    </div>
  )
}

export default MiniCalendar
