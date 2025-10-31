import { Navigate } from 'react-router-dom'

// 私有路由守卫组件
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')

  // 如果没有token，重定向到登录页
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // 有token，渲染子组件
  return children
}

export default PrivateRoute
