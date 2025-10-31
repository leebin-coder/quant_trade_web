import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message, Modal } from 'antd'
import { MobileOutlined, SafetyOutlined, CopyOutlined, SendOutlined, RedoOutlined, EditOutlined } from '@ant-design/icons'
import { authAPI } from '../services/api'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [verificationCode, setVerificationCode] = useState('')
  const [phone, setPhone] = useState('')
  const [isPhoneComplete, setIsPhoneComplete] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [phoneEditable, setPhoneEditable] = useState(true)
  const [codeEditable, setCodeEditable] = useState(false)

  // 检查是否已登录，如果已登录则跳转到主页
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 手机号验证规则
  const validatePhone = (_, value) => {
    if (!value) {
      return Promise.reject(new Error('请输入手机号'))
    }
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(value)) {
      return Promise.reject(new Error('请输入正确的手机号格式'))
    }
    return Promise.resolve()
  }

  // 手机号输入变化处理
  const handlePhoneChange = (e) => {
    const value = e.target.value
    const phoneRegex = /^1[3-9]\d{9}$/
    const isComplete = phoneRegex.test(value)
    setIsPhoneComplete(isComplete)

    if (isComplete) {
      // 手机号输入完整：锁定手机号，禁用验证码，启用两个按钮
      setPhoneEditable(false)
      setCodeEditable(false)
    } else {
      // 编辑手机号：只有手机号可编辑，其他全部禁用
      setCodeEditable(false)
    }
  }

  // 修改手机号
  const handleModifyPhone = () => {
    // 点击修改：手机号可编辑，验证码禁用，两个按钮禁用
    setPhoneEditable(true)
    setCodeEditable(false)
    setCountdown(0)
    setIsPhoneComplete(false)
    setIsLoggingIn(false)
    form.resetFields(['code'])
  }

  // 验证码输入变化处理
  const handleCodeChange = async (e) => {
    const value = e.target.value

    // 当输入满6位时自动登录
    if (value.length === 6) {
      setIsLoggingIn(true)
      try {
        const phoneValue = form.getFieldValue('phone')
        const response = await authAPI.login(phoneValue, value)

        // 只有当code是200时才认为登录成功
        if (response.code === 200) {
          const { token, userId, nickName, isNewUser } = response.data

          // 保存登录信息
          localStorage.setItem('token', token)
          localStorage.setItem('userId', userId)
          localStorage.setItem('nickName', nickName)
          localStorage.setItem('phone', phoneValue)

          message.success(isNewUser ? '注册成功，欢迎使用' : '登录成功')

          // 跳转到首页
          navigate('/dashboard')
        } else {
          // code不是200，提示验证码错误
          message.error('验证码错误')
          // 清空验证码输入框
          form.setFieldsValue({ code: '' })
          setIsLoggingIn(false)
        }
      } catch (error) {
        message.error('验证码错误')
        // 清空验证码输入框
        form.setFieldsValue({ code: '' })
        setIsLoggingIn(false)
      }
    }
  }

  // 复制验证码到剪贴板
  const copyToClipboard = (text, modalInstance) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success('验证码已复制')
        modalInstance.destroy()
      },
      () => {
        message.error('复制失败，请手动复制')
      }
    )
  }

  // 发送验证码
  const handleSendCode = async () => {
    try {
      // 验证手机号
      await form.validateFields(['phone'])
      const phoneValue = form.getFieldValue('phone')

      setLoading(true)
      const response = await authAPI.sendCode(phoneValue)

      if (response.code === 200 || response.code === 2001) {
        setPhone(phoneValue)
        setCountdown(60)
        const code = response.data.code
        setVerificationCode(code)

        // 发送成功：解锁验证码输入框
        setCodeEditable(true)

        // 显示验证码弹窗
        const modal = Modal.info({
          title: null,
          icon: null,
          content: (
            <div className="verification-modal-content">
              <div className="modal-text">
                测试版本，验证码为：<strong>{code}</strong>
              </div>
              <Button
                type="link"
                onClick={() => copyToClipboard(code, modal)}
              >
                复制
              </Button>
            </div>
          ),
          okButtonProps: { style: { display: 'none' } },
          closable: false,
          maskClosable: true,
          width: 320,
          centered: true,
        })

        if (response.data.isRegistered) {
          message.success('验证码已发送')
        } else {
          message.success('欢迎新用户，验证码已发送')
        }
      }
    } catch (error) {
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.response?.data?.message || '发送验证码失败')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-title">QUANT TRADE</div>
        <Form
          form={form}
          className="login-form"
          autoComplete="off"
        >
          {/* 手机号输入框和修改按钮 */}
          <div className="phone-row">
            <Form.Item
              name="phone"
              rules={[{ validator: validatePhone }]}
              className="phone-item"
            >
              <Input
                prefix={<MobileOutlined />}
                placeholder="输入手机号以进入"
                size="large"
                maxLength={11}
                onChange={handlePhoneChange}
                disabled={!phoneEditable || isLoggingIn}
              />
            </Form.Item>
            <Button
              type="text"
              onClick={handleModifyPhone}
              disabled={phoneEditable || !isPhoneComplete}
              className="modify-phone-btn"
              icon={<EditOutlined />}
            />
          </div>

          {/* 验证码输入框和发送按钮 */}
          <div className="code-row">
            <Form.Item
              name="code"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '验证码为6位数字' },
              ]}
              className="code-item"
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder="六位验证码"
                size="large"
                maxLength={6}
                onChange={handleCodeChange}
                disabled={!codeEditable || isLoggingIn}
              />
            </Form.Item>
            <Button
              type="text"
              onClick={handleSendCode}
              loading={loading}
              disabled={!isPhoneComplete || phoneEditable || countdown > 0}
              className="send-code-btn"
              icon={countdown > 0 ? null : (verificationCode ? <RedoOutlined /> : <SendOutlined />)}
            >
              {countdown > 0 ? `${countdown}s` : null}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  )
}

export default Login
