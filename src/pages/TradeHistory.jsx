import { Card, Table, Tag, DatePicker, Select, Space, Row, Col, Statistic } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { RangePicker } = DatePicker
const { Option } = Select

function TradeHistory() {
  // 交易记录列表
  const columns = [
    {
      title: '交易时间',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: '股票代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '交易方向',
      dataIndex: 'direction',
      key: 'direction',
      render: (direction) => (
        <Tag color={direction === '买入' ? 'red' : 'green'}>{direction}</Tag>
      ),
    },
    {
      title: '成交价格',
      dataIndex: 'price',
      key: 'price',
      render: (val) => `¥${val}`,
    },
    {
      title: '成交数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '成交额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => `¥${val.toLocaleString()}`,
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (val) =>
        val ? (
          <span style={{ color: val >= 0 ? '#f5222d' : '#52c41a' }}>
            {val >= 0 ? '+' : ''}¥{val.toLocaleString()}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '策略',
      dataIndex: 'strategy',
      key: 'strategy',
    },
  ]

  const data = [
    {
      key: '1',
      time: '2024-01-20 14:35:20',
      code: '600519',
      name: '贵州茅台',
      direction: '卖出',
      price: 1920.3,
      quantity: 100,
      amount: 192030,
      profit: 6980,
      strategy: '策略A',
    },
    {
      key: '2',
      time: '2024-01-20 10:15:30',
      code: '600519',
      name: '贵州茅台',
      direction: '买入',
      price: 1850.5,
      quantity: 100,
      amount: 185050,
      profit: null,
      strategy: '策略A',
    },
    {
      key: '3',
      time: '2024-01-19 15:20:15',
      code: '000858',
      name: '五粮液',
      direction: '卖出',
      price: 178.5,
      quantity: 200,
      amount: 35700,
      profit: -1340,
      strategy: '策略B',
    },
    {
      key: '4',
      time: '2024-01-19 09:45:10',
      code: '000858',
      name: '五粮液',
      direction: '买入',
      price: 185.2,
      quantity: 200,
      amount: 37040,
      profit: null,
      strategy: '策略B',
    },
    {
      key: '5',
      time: '2024-01-18 14:10:25',
      code: '601318',
      name: '中国平安',
      direction: '买入',
      price: 52.3,
      quantity: 500,
      amount: 26150,
      profit: null,
      strategy: '策略C',
    },
  ]

  // 每日盈亏统计图
  const profitChartOption = {
    title: {
      text: '每日盈亏统计',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: ['1/15', '1/16', '1/17', '1/18', '1/19', '1/20', '1/21'],
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}',
      },
    },
    series: [
      {
        name: '盈亏',
        type: 'bar',
        data: [
          { value: 2500, itemStyle: { color: '#f5222d' } },
          { value: -1200, itemStyle: { color: '#52c41a' } },
          { value: 3800, itemStyle: { color: '#f5222d' } },
          { value: 1500, itemStyle: { color: '#f5222d' } },
          { value: -1340, itemStyle: { color: '#52c41a' } },
          { value: 6980, itemStyle: { color: '#f5222d' } },
          { value: 2100, itemStyle: { color: '#f5222d' } },
        ],
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  }

  // 交易次数统计图
  const tradeCountOption = {
    title: {
      text: '交易次数统计',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}次 ({d}%)',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{c}次',
        },
        data: [
          { value: 45, name: '策略A' },
          { value: 32, name: '策略B' },
          { value: 28, name: '策略C' },
          { value: 23, name: '策略D' },
        ],
      },
    ],
  }

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日交易次数"
              value={8}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日成交额"
              value={520000}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日盈亏"
              value={8680}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowUpOutlined />}
              suffix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日胜率"
              value={75}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 图表展示 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card>
            <ReactECharts option={profitChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <ReactECharts option={tradeCountOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      {/* 筛选条件 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <RangePicker />
          <Select defaultValue="all" style={{ width: 150 }}>
            <Option value="all">全部策略</Option>
            <Option value="a">策略A</Option>
            <Option value="b">策略B</Option>
            <Option value="c">策略C</Option>
          </Select>
          <Select defaultValue="all" style={{ width: 150 }}>
            <Option value="all">全部方向</Option>
            <Option value="buy">买入</Option>
            <Option value="sell">卖出</Option>
          </Select>
        </Space>
      </Card>

      {/* 交易记录表格 */}
      <Card title="交易记录">
        <Table
          columns={columns}
          dataSource={data}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  )
}

export default TradeHistory
