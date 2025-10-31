import { useState } from 'react'
import { Row, Col, Card, Table, Tag, Input, Select, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Option } = Select

function MarketMonitor() {
  const [selectedStock, setSelectedStock] = useState('600519')

  // 生成K线图数据
  const generateKLineData = () => {
    const data = []
    let base = 1850
    for (let i = 0; i < 60; i++) {
      const open = base + Math.random() * 20 - 10
      const close = open + Math.random() * 30 - 15
      const high = Math.max(open, close) + Math.random() * 10
      const low = Math.min(open, close) - Math.random() * 10
      data.push([open.toFixed(2), close.toFixed(2), low.toFixed(2), high.toFixed(2)])
      base = close
    }
    return data
  }

  const generateVolumeData = () => {
    return Array.from({ length: 60 }, () => Math.floor(Math.random() * 100000 + 50000))
  }

  // K线图配置
  const klineOption = {
    title: {
      text: `${selectedStock} - 贵州茅台`,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: function (params) {
        const klineData = params[0]
        if (klineData) {
          const data = klineData.data
          return `日期: ${klineData.axisValue}<br/>
                  开盘: ${data[0]}<br/>
                  收盘: ${data[1]}<br/>
                  最低: ${data[2]}<br/>
                  最高: ${data[3]}`
        }
      },
    },
    grid: [
      {
        left: '10%',
        right: '8%',
        height: '50%',
      },
      {
        left: '10%',
        right: '8%',
        top: '70%',
        height: '15%',
      },
    ],
    xAxis: [
      {
        type: 'category',
        data: Array.from({ length: 60 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - 60 + i)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }),
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
      {
        type: 'category',
        gridIndex: 1,
        data: Array.from({ length: 60 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - 60 + i)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }),
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: 'dataMin',
        max: 'dataMax',
      },
    ],
    yAxis: [
      {
        scale: true,
        splitArea: {
          show: true,
        },
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 50,
        end: 100,
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        bottom: '5%',
        start: 50,
        end: 100,
      },
    ],
    series: [
      {
        name: 'K线',
        type: 'candlestick',
        data: generateKLineData(),
        itemStyle: {
          color: '#ef232a',
          color0: '#14b143',
          borderColor: '#ef232a',
          borderColor0: '#14b143',
        },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: generateVolumeData(),
        itemStyle: {
          color: function (params) {
            const klineData = generateKLineData()[params.dataIndex]
            return klineData[0] > klineData[1] ? '#14b143' : '#ef232a'
          },
        },
      },
    ],
  }

  // 实时报价数据
  const realtimeColumns = [
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
      title: '最新价',
      dataIndex: 'price',
      key: 'price',
      render: (val, record) => (
        <span style={{ color: record.change >= 0 ? '#f5222d' : '#52c41a' }}>
          ¥{val}
        </span>
      ),
    },
    {
      title: '涨跌幅',
      dataIndex: 'change',
      key: 'change',
      render: (val) => (
        <Tag color={val >= 0 ? 'red' : 'green'}>
          {val >= 0 ? '+' : ''}
          {val}%
        </Tag>
      ),
      sorter: (a, b) => a.change - b.change,
    },
    {
      title: '成交量',
      dataIndex: 'volume',
      key: 'volume',
      render: (val) => `${(val / 10000).toFixed(2)}万`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <a onClick={() => setSelectedStock(record.code)}>查看详情</a>
      ),
    },
  ]

  const realtimeData = [
    {
      key: '1',
      code: '600519',
      name: '贵州茅台',
      price: 1920.3,
      change: 2.15,
      volume: 850000,
    },
    {
      key: '2',
      code: '000858',
      name: '五粮液',
      price: 178.5,
      change: -1.32,
      volume: 1250000,
    },
    {
      key: '3',
      code: '601318',
      name: '中国平安',
      price: 54.8,
      change: 1.85,
      volume: 2100000,
    },
    {
      key: '4',
      code: '600036',
      name: '招商银行',
      price: 42.5,
      change: -0.47,
      volume: 1800000,
    },
    {
      key: '5',
      code: '000001',
      name: '平安银行',
      price: 13.2,
      change: 3.92,
      volume: 3500000,
    },
  ]

  return (
    <div>
      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Input
            placeholder="输入股票代码或名称"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
          <Select defaultValue="all" style={{ width: 150 }}>
            <Option value="all">全部板块</Option>
            <Option value="tech">科技股</Option>
            <Option value="finance">金融股</Option>
            <Option value="consume">消费股</Option>
          </Select>
          <Select defaultValue="realtime" style={{ width: 150 }}>
            <Option value="realtime">实时行情</Option>
            <Option value="hot">热门股票</Option>
            <Option value="rise">涨幅榜</Option>
            <Option value="fall">跌幅榜</Option>
          </Select>
        </Space>
      </Card>

      {/* K线图 */}
      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={klineOption} style={{ height: 600 }} />
      </Card>

      {/* 实时报价表 */}
      <Card title="实时报价">
        <Table columns={realtimeColumns} dataSource={realtimeData} />
      </Card>
    </div>
  )
}

export default MarketMonitor
