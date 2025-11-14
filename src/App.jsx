import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Quotes from './pages/Quotes'
import StrategyManage from './pages/StrategyManage'
import TradeHistory from './pages/TradeHistory'

function App() {
  return (
    <Routes>
      {/* 登录页面 - 无需认证 */}
      <Route path="/login" element={<Login />} />

      {/* 主应用 - 需要认证 */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="strategy" element={<StrategyManage />} />
        <Route path="history" element={<TradeHistory />} />
      </Route>

      {/* 404 - 重定向到首页 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
