import { useState, useEffect } from 'react'
import { CalendarOutlined } from '@ant-design/icons'
import { tradingCalendarAPI } from '../../services/api'
import { updateTradingSessionFromCalendar } from '../../utils/tradingSession'
import CalendarModal from './CalendarModal'
import './index.css'

const TradingCalendar = () => {
  const [tradingDays, setTradingDays] = useState([])
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // 获取交易日历数据
  const fetchTradingCalendar = async (year) => {
    if (loading) return

    setLoading(true)
    try {
      const response = await tradingCalendarAPI.getTradingCalendarByYear(year)
      if (response.code === 200 && response.data) {
        setTradingDays(response.data)
        updateTradingSessionFromCalendar(response.data)
      }
    } catch (error) {
      console.error('获取交易日历失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载当前年份数据
  useEffect(() => {
    fetchTradingCalendar(currentYear)
  }, [])

  // 点击图标打开大日历弹窗
  const handleIconClick = () => {
    setShowModal(true)
  }

  return (
    <>
      <div
        className="trading-calendar-icon"
        onClick={handleIconClick}
        title="交易日历"
      >
        <CalendarOutlined />
      </div>

      <CalendarModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        year={currentYear}
        month={currentMonth}
        tradingDays={tradingDays}
        onYearChange={fetchTradingCalendar}
      />
    </>
  )
}

export default TradingCalendar
