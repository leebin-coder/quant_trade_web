import { Row, Col, Card, Statistic, Table, Progress } from 'antd'
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

function Dashboard() {
  // 收益曲线配置
  const profitChartOption = {
    title: {
      text: '累计收益曲线',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
      },
    },
    series: [
      {
        name: '收益率',
        data: [2.5, 5.2, 8.1, 6.8, 11.2, 14.5, 18.3],
        type: 'line',
        smooth: true,
        areaStyle: {
          color: 'rgba(24, 144, 255, 0.2)',
        },
        itemStyle: {
          color: '#1890ff',
        },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  }

  // 资产分布配置
  const assetChartOption = {
    title: {
      text: '资产分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}万 ({d}%)',
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
          formatter: '{b}\n{d}%',
        },
        data: [
          { value: 150, name: '股票' },
          { value: 80, name: '期货' },
          { value: 50, name: '期权' },
          { value: 120, name: '现金' },
        ],
      },
    ],
  }

  // 持仓列表
  const positionColumns = [
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
      title: '持仓数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '成本价',
      dataIndex: 'cost',
      key: 'cost',
      render: (val) => `¥${val}`,
    },
    {
      title: '当前价',
      dataIndex: 'price',
      key: 'price',
      render: (val) => `¥${val}`,
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (val) => (
        <span style={{ color: val >= 0 ? '#f5222d' : '#52c41a' }}>
          {val >= 0 ? '+' : ''}
          {val}%
        </span>
      ),
    },
  ]

  const positionData = [
    {
      key: '1',
      code: '600519',
      name: '贵州茅台',
      quantity: 100,
      cost: 1850.5,
      price: 1920.3,
      profit: 3.77,
    },
    {
      key: '2',
      code: '000858',
      name: '五粮液',
      quantity: 200,
      cost: 185.2,
      price: 178.5,
      profit: -3.62,
    },
    {
      key: '3',
      code: '601318',
      name: '中国平安',
      quantity: 500,
      cost: 52.3,
      price: 54.8,
      profit: 4.78,
    },
  ]

  return (
    <div>
      {/* 核心指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="账户总资产"
              value={400000}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日收益"
              value={3250.5}
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
              title="累计收益率"
              value={18.3}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix={<RiseOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="胜率"
              value={68.5}
              precision={1}
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
            <ReactECharts option={assetChartOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      {/* 策略状态 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card title="策略运行状态">
            <Row gutter={16}>
              <Col span={6}>
                <div style={{ marginBottom: 16 }}>
                  <div>策略A - 趋势跟踪</div>
                  <Progress percent={85} status="active" />
                </div>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 16 }}>
                  <div>策略B - 均值回归</div>
                  <Progress percent={72} status="active" />
                </div>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 16 }}>
                  <div>策略C - 动量交易</div>
                  <Progress percent={68} />
                </div>
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 16 }}>
                  <div>策略D - 网格交易</div>
                  <Progress percent={90} status="active" />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 持仓列表 */}
      <Card title="当前持仓">
        <Table
          columns={positionColumns}
          dataSource={positionData}
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default Dashboard
