import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import Dashboard from './pages/Dashboard'
import MarketMonitor from './pages/MarketMonitor'
import StrategyManage from './pages/StrategyManage'
import TradeHistory from './pages/TradeHistory'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="market" element={<MarketMonitor />} />
        <Route path="strategy" element={<StrategyManage />} />
        <Route path="history" element={<TradeHistory />} />
      </Route>
    </Routes>
  )
}

export default App
