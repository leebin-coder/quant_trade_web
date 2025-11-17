import { useState, useEffect, useRef } from 'react'
import { Dropdown, Menu, Input, List, Tag, Spin, Modal, Button, Tabs } from 'antd'
import { FilterOutlined, SearchOutlined, CloseOutlined, InfoCircleOutlined, QrcodeOutlined } from '@ant-design/icons'
import contactMeImg from '../assets/contract_me.jpeg'
import donateImg from '../assets/donate.JPG'
import './MarketSelector.css'

const MarketSelector = () => {
  const [visible, setVisible] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState({ level1: '股票', level2: 'A股' })
  const [selectedStocks, setSelectedStocks] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [stockList, setStockList] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const listContainerRef = useRef(null)
  const [qrCodeVisible, setQrCodeVisible] = useState(false)

  // 市场配置
  const marketConfig = {
    '全部': {
      items: [],
      enabled: []
    },
    '关注': {
      items: [],
      enabled: []
    },
    '股票': {
      items: ['A股', '港股', '美股', '沪深港通', '新三板', 'B股'],
      enabled: ['A股']
    },
    '全球': {
      items: ['全球市场', '台湾市场', '日本市场', '韩国市场', '新加坡市场', '越南市场', '英国市场'],
      enabled: []
    },
    '债券': { items: [], enabled: [] },
    '基金': { items: [], enabled: [] },
    '期货': { items: [], enabled: [] },
    '外汇': { items: [], enabled: [] },
  }

  // 可选择的一级市场 - 关注在最左边
  const enabledLevel1 = ['关注', '全部', '股票']

  // 一级市场的顺序 - 关注在最左边
  const level1Order = ['关注', '全部', '股票', '全球', '债券', '基金', '期货', '外汇']

  // 获取交易所代码
  const getExchanges = (level1, level2) => {
    if (level1 === '全部') {
      return [] // 全部市场不传交易所参数
    }
    if (level2 === 'A股') {
      return ['SSE', 'SZSE', 'BSE']
    }
    return []
  }

  // 获取交易所颜色
  const getExchangeColor = (exchange) => {
    const colors = {
      'SSE': '#e74c3c',  // 上海 - 红色
      'SZSE': '#3498db',  // 深圳 - 蓝色
      'BSE': '#f39c12',  // 北京 - 橙色
    }
    return colors[exchange] || '#95a5a6'
  }

  // 搜索股票
  const searchStocks = async (keyword = '', pageNum = 0, append = false) => {
    const token = localStorage.getItem('token')
    if (!token) return

    // 关注列表暂时为空
    if (selectedMarket.level1 === '关注') {
      setStockList([])
      setHasMore(false)
      return
    }

    setLoading(true)
    try {
      const exchanges = getExchanges(selectedMarket.level1, selectedMarket.level2)
      const response = await fetch('/api/stocks/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword,
          exchanges: exchanges,
          page: pageNum,
          size: 60,
          sortBy: 'stockCode',
          sortDir: 'asc',
        }),
      })

      const result = await response.json()
      if (result.code === 200) {
        const newData = result.data || []
        if (append) {
          setStockList(prev => [...prev, ...newData])
        } else {
          setStockList(newData)
        }
        setHasMore(newData.length === 60)
      }
    } catch (error) {
      console.error('搜索股票失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 处理滚动加载
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop <= clientHeight + 50 && !loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      searchStocks(searchKeyword, nextPage, true)
    }
  }

  // 当市场改变时，自动搜索
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    if (selectedMarket.level1 === '全部' || selectedMarket.level1 === '关注' || selectedMarket.level2 === 'A股') {
      searchStocks(searchKeyword, 0, false)
    }
  }, [selectedMarket])

  // 当搜索关键词改变时
  const handleSearchChange = (value) => {
    setSearchKeyword(value)
    setPage(0)
    setHasMore(true)
    searchStocks(value, 0, false)
  }

  // 选择市场
  const handleMarketSelect = (level1, level2) => {
    const isEnabled = marketConfig[level1].enabled.includes(level2)
    if (!isEnabled) return

    setSelectedMarket({ level1, level2 })
    setVisible(false)
  }

  // 选择股票（多选）
  const handleStockSelect = (stock) => {
    const isSelected = selectedStocks.some(s => s.stockCode === stock.stockCode)
    if (isSelected) {
      // 取消选中
      setSelectedStocks(selectedStocks.filter(s => s.stockCode !== stock.stockCode))
    } else {
      // 添加选中到最前面，随机添加涨跌属性
      const trend = Math.random() > 0.5 ? 'up' : 'down'
      setSelectedStocks([{ ...stock, trend }, ...selectedStocks])
    }
  }

  // 删除选中的股票
  const removeStock = (stockCode) => {
    setSelectedStocks(selectedStocks.filter(s => s.stockCode !== stockCode))
  }

  // 处理第一级市场点击
  const handleLevel1Click = (level1) => {
    const isEnabled = enabledLevel1.includes(level1)
    if (!isEnabled) return

    if (level1 === '全部' || level1 === '关注') {
      // 全部和关注没有二级分类
      setSelectedMarket({ level1, level2: null })
    } else if (marketConfig[level1].items.length > 0) {
      // 有二级分类的，默认选第一个
      setSelectedMarket({ level1, level2: marketConfig[level1].items[0] })
    }
  }

  // 生成菜单
  const menu = (
    <div className="market-selector-dropdown">
      {/* 市场选择区域 */}
      <div className="market-selection">
        <div className="market-level1">
          {level1Order.map(level1 => {
            const isEnabled = enabledLevel1.includes(level1)
            return (
              <div
                key={level1}
                className={`level1-item ${selectedMarket.level1 === level1 ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`}
                onClick={() => handleLevel1Click(level1)}
              >
                <span>{level1}</span>
              </div>
            )
          })}
        </div>
        <div className="market-level2">
          {marketConfig[selectedMarket.level1].items.length > 0 ? (
            marketConfig[selectedMarket.level1].items.map(level2 => {
              const isEnabled = marketConfig[selectedMarket.level1].enabled.includes(level2)
              return (
                <div
                  key={level2}
                  className={`level2-item ${selectedMarket.level2 === level2 ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`}
                  onClick={() => handleMarketSelect(selectedMarket.level1, level2)}
                >
                  <span>{level2}</span>
                </div>
              )
            })
          ) : (
            <div className="level2-empty-notice">
              <InfoCircleOutlined className="notice-icon" />
              <div className="notice-marquee">
                  <div className="marquee-content">
                      Developer funds are limited, and the current version only processes A-share data. If you want
                      better data services, please scan the QR code on the right to contact me or donate to me, and I
                      will consider your needs as soon as possible
                  </div>
              </div>
              <Button
                type="text"
                icon={<QrcodeOutlined />}
                size="small"
                className="donate-btn"
                onClick={() => setQrCodeVisible(true)}
              >
                联系我
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 股票搜索和列表 */}
      {(selectedMarket.level1 === '全部' || selectedMarket.level1 === '关注' || selectedMarket.level2 === 'A股') && (
        <div className="stock-search-area">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索股票代码或名称"
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            onPressEnter={() => handleSearchChange(searchKeyword)}
            className="stock-search-input"
          />
          <div
            className="stock-list-container"
            ref={listContainerRef}
            onScroll={handleScroll}
          >
            {loading && page === 0 ? (
              <div className="loading-container">
                <Spin />
              </div>
            ) : (
              <>
                <div className="stock-grid">
                  {stockList.map((stock) => {
                    const isSelected = selectedStocks.some(s => s.stockCode === stock.stockCode)
                    return (
                      <div
                        key={stock.stockCode}
                        className={`stock-grid-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleStockSelect(stock)}
                      >
                        <div className="stock-name-large">{stock.stockName}</div>
                        <div className="stock-code-row">
                          <span className="stock-code-small">{stock.stockCode}</span>
                          <Tag
                            color={getExchangeColor(stock.exchange)}
                            className="stock-exchange-tag"
                          >
                            {stock.exchange}
                          </Tag>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {loading && page > 0 && (
                  <div className="loading-more">
                    <Spin size="small" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return {
    trigger: (
      <div className="market-selector-trigger">
        <FilterOutlined className="filter-icon" />
        <span className="market-text">STOCKS</span>
      </div>
    ),
    dropdown: (
      <>
        <Dropdown
          overlay={menu}
          trigger={['click']}
          visible={visible}
          onVisibleChange={setVisible}
          placement="bottomLeft"
        >
          <div className="market-selector-trigger">
            <FilterOutlined className="filter-icon" />
            <span className="market-text">STOCKS</span>
          </div>
        </Dropdown>

        {/* 联系我/捐赠二维码弹窗 */}
        <Modal
          title="联系方式"
          open={qrCodeVisible}
          onCancel={() => setQrCodeVisible(false)}
          footer={null}
          centered
          width={400}
        >
          <Tabs
            defaultActiveKey="contact"
            centered
            items={[
              {
                key: 'contact',
                label: '联系我',
                children: (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <img
                      src={contactMeImg}
                      alt="联系我"
                      style={{
                        width: '200px',
                        height: '200px',
                        margin: '0 auto 16px',
                        borderRadius: '8px',
                        objectFit: 'contain'
                      }}
                    />
                    <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                      扫码添加微信，获取更多帮助
                    </p>
                  </div>
                )
              },
              {
                key: 'donate',
                label: '捐赠支持',
                children: (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <img
                      src={donateImg}
                      alt="捐赠"
                      style={{
                        width: '200px',
                        height: '200px',
                        margin: '0 auto 16px',
                        borderRadius: '8px',
                        objectFit: 'contain'
                      }}
                    />
                    <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                      感谢您的支持，助力项目更好发展
                    </p>
                  </div>
                )
              }
            ]}
          />
        </Modal>
      </>
    ),
    selectedStocks,
    setSelectedStocks,
    removeStock,
    getExchangeColor,
  }
}

export default MarketSelector
