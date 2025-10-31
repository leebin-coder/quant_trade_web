import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Descriptions,
} from 'antd'
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Option } = Select
const { TextArea } = Input

function StrategyManage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [form] = Form.useForm()

  // 策略列表数据
  const strategyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '策略类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const colorMap = {
          趋势跟踪: 'blue',
          均值回归: 'green',
          动量交易: 'orange',
          网格交易: 'purple',
        }
        return <Tag color={colorMap[type]}>{type}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === '运行中' ? 'success' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '收益率',
      dataIndex: 'profit',
      key: 'profit',
      render: (val) => (
        <span style={{ color: val >= 0 ? '#f5222d' : '#52c41a' }}>
          {val >= 0 ? '+' : ''}
          {val}%
        </span>
      ),
      sorter: (a, b) => a.profit - b.profit,
    },
    {
      title: '胜率',
      dataIndex: 'winRate',
      key: 'winRate',
      render: (val) => `${val}%`,
    },
    {
      title: '最大回撤',
      dataIndex: 'maxDrawdown',
      key: 'maxDrawdown',
      render: (val) => `${val}%`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
          <Button
            type="text"
            icon={
              record.status === '运行中' ? (
                <PauseCircleOutlined />
              ) : (
                <PlayCircleOutlined />
              )
            }
            onClick={() => handleToggleStatus(record)}
          />
          <Button type="text" icon={<EditOutlined />} />
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Space>
      ),
    },
  ]

  const strategyData = [
    {
      key: '1',
      name: '策略A - 趋势跟踪',
      type: '趋势跟踪',
      status: '运行中',
      profit: 15.8,
      winRate: 68.5,
      maxDrawdown: 8.2,
    },
    {
      key: '2',
      name: '策略B - 均值回归',
      type: '均值回归',
      status: '已停止',
      profit: 12.3,
      winRate: 72.1,
      maxDrawdown: 5.6,
    },
    {
      key: '3',
      name: '策略C - 动量交易',
      type: '动量交易',
      status: '运行中',
      profit: 18.6,
      winRate: 65.8,
      maxDrawdown: 10.3,
    },
    {
      key: '4',
      name: '策略D - 网格交易',
      type: '网格交易',
      status: '运行中',
      profit: 9.2,
      winRate: 78.5,
      maxDrawdown: 4.1,
    },
  ]

  // 策略收益对比图
  const comparisonOption = {
    title: {
      text: '策略收益对比',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['策略A', '策略B', '策略C', '策略D'],
      top: 30,
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
      },
    },
    series: [
      {
        name: '策略A',
        type: 'line',
        data: [2, 5, 8, 10, 13, 15.8],
        smooth: true,
      },
      {
        name: '策略B',
        type: 'line',
        data: [1.5, 4, 6, 8, 10, 12.3],
        smooth: true,
      },
      {
        name: '策略C',
        type: 'line',
        data: [3, 7, 10, 13, 16, 18.6],
        smooth: true,
      },
      {
        name: '策略D',
        type: 'line',
        data: [1, 3, 5, 6.5, 8, 9.2],
        smooth: true,
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  }

  const handleAddStrategy = () => {
    setIsModalOpen(true)
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      console.log('新增策略:', values)
      message.success('策略创建成功')
      setIsModalOpen(false)
      form.resetFields()
    })
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
  }

  const handleViewDetail = (record) => {
    setSelectedStrategy(record)
    setDetailModalOpen(true)
  }

  const handleToggleStatus = (record) => {
    const newStatus = record.status === '运行中' ? '已停止' : '运行中'
    message.success(`策略已${newStatus === '运行中' ? '启动' : '停止'}`)
  }

  return (
    <div>
      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddStrategy}
        >
          新增策略
        </Button>
      </Card>

      {/* 策略收益对比图 */}
      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={comparisonOption} style={{ height: 400 }} />
      </Card>

      {/* 策略列表 */}
      <Card title="策略列表">
        <Table columns={strategyColumns} dataSource={strategyData} />
      </Card>

      {/* 新增策略弹窗 */}
      <Modal
        title="新增策略"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="策略名称"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input placeholder="请输入策略名称" />
          </Form.Item>
          <Form.Item
            name="type"
            label="策略类型"
            rules={[{ required: true, message: '请选择策略类型' }]}
          >
            <Select placeholder="请选择策略类型">
              <Option value="trend">趋势跟踪</Option>
              <Option value="mean">均值回归</Option>
              <Option value="momentum">动量交易</Option>
              <Option value="grid">网格交易</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="策略描述">
            <TextArea rows={4} placeholder="请输入策略描述" />
          </Form.Item>
          <Form.Item
            name="capital"
            label="初始资金"
            rules={[{ required: true, message: '请输入初始资金' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="请输入初始资金"
              addonAfter="元"
            />
          </Form.Item>
          <Form.Item name="autoStart" label="创建后自动启动" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 策略详情弹窗 */}
      <Modal
        title="策略详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedStrategy && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="策略名称" span={2}>
              {selectedStrategy.name}
            </Descriptions.Item>
            <Descriptions.Item label="策略类型">
              {selectedStrategy.type}
            </Descriptions.Item>
            <Descriptions.Item label="运行状态">
              <Tag
                color={
                  selectedStrategy.status === '运行中' ? 'success' : 'default'
                }
              >
                {selectedStrategy.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="累计收益率">
              <span
                style={{
                  color: selectedStrategy.profit >= 0 ? '#f5222d' : '#52c41a',
                }}
              >
                {selectedStrategy.profit >= 0 ? '+' : ''}
                {selectedStrategy.profit}%
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="胜率">
              {selectedStrategy.winRate}%
            </Descriptions.Item>
            <Descriptions.Item label="最大回撤">
              {selectedStrategy.maxDrawdown}%
            </Descriptions.Item>
            <Descriptions.Item label="夏普比率">1.85</Descriptions.Item>
            <Descriptions.Item label="交易次数">128次</Descriptions.Item>
            <Descriptions.Item label="盈利次数">88次</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              2024-01-15 10:30:00
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default StrategyManage
