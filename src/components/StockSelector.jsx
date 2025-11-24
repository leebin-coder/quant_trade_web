import { useState, useRef, useEffect } from 'react'
import { Input, Spin, Empty } from 'antd'
import { SearchOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import { stockRelationAPI } from '../services/api'
import './StockSelector.css'

/**
 * 股票选择器组件
 * 左侧固定,包含股票搜索和我的关注两个区域
 * @param {Function} onStockSelect - 选中股票时的回调函数
 */
function StockSelector({ onStockSelect }) {
  const [activeSection, setActiveSection] = useState('favorite') // null, 'search' 或 'favorite'
  const [searchKeyword, setSearchKeyword] = useState('')
  const [stockList, setStockList] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [selectedStockCode, setSelectedStockCode] = useState(null) // 选中的股票代码
  const listContainerRef = useRef(null)

  // 关注列表相关状态
  const [favoriteList, setFavoriteList] = useState([])
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [favoritePage, setFavoritePage] = useState(0)
  const [favoriteHasMore, setFavoriteHasMore] = useState(true)
  const favoriteListRef = useRef(null)

  // 搜索股票 - 调用接口
  const searchStocks = async (keyword = '', pageNum = 0, append = false) => {
    const token = localStorage.getItem('token')
    if (!token) return

    // 如果没有关键词,不查询
    if (!keyword || keyword.trim() === '') {
      setStockList([])
      setHasMore(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stocks/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword,
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

  // 当搜索关键词改变时
  const handleSearchChange = (value) => {
    setSearchKeyword(value)
    setPage(0)
    setHasMore(true)
    searchStocks(value, 0, false)
  }

  // 获取关注列表
  const fetchFavoriteStocks = async (pageNum = 0, append = false) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setFavoriteLoading(true)
    try {
      const response = await stockRelationAPI.getFollowedStocks({
        page: pageNum,
        size: 60,
        sort: 'createdAt,desc',
      })

      if (response.code === 200 && response.data) {
        // 兼容两种数据结构：分页对象(content字段) 或 直接数组
        let newData = Array.isArray(response.data)
          ? response.data
          : (response.data.content || [])

        // 前端排序：按创建时间降序（最新的在前面）
        newData = newData.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.createTime || 0).getTime()
          const timeB = new Date(b.createdAt || b.createTime || 0).getTime()
          return timeB - timeA // 降序
        })

        if (append) {
          setFavoriteList(prev => [...prev, ...newData])
        } else {
          setFavoriteList(newData)
        }
        // 如果是分页对象，使用last字段；如果是数组，根据长度判断
        const hasMore = Array.isArray(response.data)
          ? newData.length === 60
          : !response.data.last
        setFavoriteHasMore(hasMore)
      }
    } catch (error) {
      console.error('获取关注列表失败:', error)
    } finally {
      setFavoriteLoading(false)
    }
  }

  // 处理关注列表滚动加载
  const handleFavoriteScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop <= clientHeight + 50 && !favoriteLoading && favoriteHasMore) {
      const nextPage = favoritePage + 1
      setFavoritePage(nextPage)
      fetchFavoriteStocks(nextPage, true)
    }
  }

  // 添加关注
  const handleFollowStock = async (stockCode) => {
    try {
      const response = await stockRelationAPI.followStock(stockCode)
      if (response.code === 200) {
        // 更新搜索列表中的isFollowed状态
        setStockList(prev => prev.map(stock =>
          stock.stockCode === stockCode
            ? { ...stock, isFollowed: true }
            : stock
        ))

        // 如果在关注Tab,刷新关注列表
        if (activeSection === 'favorite') {
          setFavoritePage(0)
          fetchFavoriteStocks(0, false)
        }
      }
    } catch (error) {
      console.error('关注失败:', error)
    }
  }

  // 取消关注
  const handleUnfollowStock = async (stockCode) => {
    try {
      const response = await stockRelationAPI.unfollowStock(stockCode)
      if (response.code === 200) {
        // 更新搜索列表中的isFollowed状态
        setStockList(prev => prev.map(stock =>
          stock.stockCode === stockCode
            ? { ...stock, isFollowed: false }
            : stock
        ))

        // 如果在关注Tab,刷新关注列表
        if (activeSection === 'favorite') {
          setFavoritePage(0)
          fetchFavoriteStocks(0, false)
        }
      }
    } catch (error) {
      console.error('取消关注失败:', error)
    }
  }

  // 组件挂载时不加载数据,只有用户输入才查询
  // useEffect(() => {
  //   searchStocks('', 0, false)
  // }, [])

  // 切换到关注Tab时加载关注列表
  useEffect(() => {
    if (activeSection === 'favorite') {
      setFavoritePage(0)
      fetchFavoriteStocks(0, false)
    }
  }, [activeSection])

  return (
    <div className={`stock-selector ${activeSection ? 'has-active-section' : ''}`}>
      {/* 顶部切换按钮 */}
      <div className="section-tabs">
        {/* 搜索图标/输入框 */}
        {activeSection === 'search' ? (
          <div className="search-input-container">
            <Input
              prefix={<SearchOutlined />}
              placeholder="输入代码或名称"
              value={searchKeyword}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input-inline"
              allowClear
              autoFocus
            />
          </div>
        ) : (
          <div
            className="tab-icon-btn"
            onClick={() => setActiveSection('search')}
          >
            <SearchOutlined style={{ fontSize: '20px', color: '#ffffff' }} />
          </div>
        )}

        {/* 关注图标/文字 */}
        {activeSection === 'favorite' ? (
          <div className="followed-text-container">
            <span>我的关注</span>
          </div>
        ) : (
          <div
            className="tab-icon-btn"
            onClick={() => setActiveSection('favorite')}
          >
            <StarOutlined style={{ fontSize: '20px', color: '#ffffff' }} />
          </div>
        )}
      </div>

      {/* 内容区域 - 固定高度 */}
      <div className="selector-content">
        {/* Search区域 */}
        <div className={`search-section ${activeSection === 'search' ? 'active' : ''}`}>
          <div
            className="stock-list"
            ref={listContainerRef}
            onScroll={handleScroll}
          >
            {loading && page === 0 ? (
              <div className="loading-container">
                <Spin />
              </div>
            ) : searchKeyword.trim() === '' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty
                  description="请输入股票代码或名称搜索"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            ) : stockList.length > 0 ? (
              <>
                {stockList.map((stock) => (
                  <div
                    key={stock.stockCode}
                    className={`stock-item ${selectedStockCode === stock.stockCode ? 'selected' : ''}`}
                  >
                    <div className="stock-info" onClick={() => {
                      setSelectedStockCode(stock.stockCode)
                      onStockSelect && onStockSelect(stock)
                    }}>
                      <div className="stock-name">{stock.stockName}</div>
                      <div className="stock-code-row">
                        <div className="stock-code">{stock.stockCode.split('.')[0]}</div>
                        <div className="stock-exchange" data-exchange={stock.exchange}>{stock.exchange}</div>
                      </div>
                    </div>
                    <div className="stock-actions">
                      {stock.isFollowed ? (
                        <StarFilled
                          className="star-icon filled"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnfollowStock(stock.stockCode)
                          }}
                        />
                      ) : (
                        <StarOutlined
                          className="star-icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFollowStock(stock.stockCode)
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
                {loading && page > 0 && (
                  <div className="loading-more">
                    <Spin size="small" />
                  </div>
                )}
              </>
            ) : (
              <Empty
                description="暂无数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </div>

        {/* 我的关注区域 */}
        <div className={`favorite-section ${activeSection === 'favorite' ? 'active' : ''}`}>
          <div
            className="favorite-list"
            ref={favoriteListRef}
            onScroll={handleFavoriteScroll}
          >
            {favoriteLoading && favoritePage === 0 ? (
              <div className="loading-container">
                <Spin />
              </div>
            ) : favoriteList.length > 0 ? (
              <>
                {favoriteList.map((stock) => (
                  <div
                    key={stock.stockCode}
                    className={`stock-item ${selectedStockCode === stock.stockCode ? 'selected' : ''}`}
                  >
                    <div className="stock-info" onClick={() => {
                      setSelectedStockCode(stock.stockCode)
                      onStockSelect && onStockSelect(stock)
                    }}>
                      <div className="stock-name">{stock.stockName}</div>
                      <div className="stock-code-row">
                        <div className="stock-code">{stock.stockCode.split('.')[0]}</div>
                        <div className="stock-exchange" data-exchange={stock.exchange}>{stock.exchange}</div>
                      </div>
                    </div>
                    <div className="stock-actions">
                      <StarFilled
                        className="star-icon filled"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUnfollowStock(stock.stockCode)
                        }}
                      />
                    </div>
                  </div>
                ))}
                {favoriteLoading && favoritePage > 0 && (
                  <div className="loading-more">
                    <Spin size="small" />
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Empty
                  description="暂无关注"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockSelector
