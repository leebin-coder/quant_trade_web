# 量化交易Web系统

一个基于 React + Ant Design + ECharts 的现代化量化交易管理平台。

## 功能特性

### 核心功能
- **仪表盘** - 实时查看账户总资产、收益率、策略运行状态等核心指标
- **行情监控** - 实时行情数据展示,支持K线图、成交量等多维度分析
- **策略管理** - 创建、启停、监控多个交易策略,支持策略收益对比
- **交易记录** - 查看历史交易记录,统计分析盈亏情况
- **知识库** - 内置知识库系统,支持树状结构导航和网页内容展示

### 技术亮点
- **现代化技术栈** - React 18 + Vite 构建，开发体验极佳
- **丰富的图表** - 集成 ECharts 实现专业的金融图表展示
- **企业级UI** - 使用 Ant Design 5.x 组件库，界面美观易用
- **响应式设计** - 支持多种屏幕尺寸，移动端友好
- **模块化架构** - 清晰的目录结构，易于维护和扩展

## 技术栈

- **前端框架**: React 18.2
- **构建工具**: Vite 5.0
- **UI组件库**: Ant Design 5.12
- **图表库**: ECharts 5.4 + echarts-for-react
- **路由**: React Router 6.20
- **HTTP客户端**: Axios 1.6
- **日期处理**: Day.js 1.11

## 项目结构

```
quant_trade_web/
├── public/                      # 静态资源
├── src/
│   ├── assets/                 # 图片、字体等资源文件
│   ├── components/             # 公共组件
│   │   ├── MainLayout.jsx         # 主布局组件
│   │   ├── KnowledgeBasePanel.jsx # 知识库面板组件
│   │   └── KnowledgeBaseTree.jsx  # 知识库树形导航组件
│   ├── config/                 # 配置文件
│   │   ├── knowledgeBase.js       # 知识库内容配置
│   │   └── knowledgeBase.example.js # 知识库配置示例
│   ├── pages/                  # 页面组件
│   │   ├── Dashboard.jsx          # 仪表盘
│   │   ├── MarketMonitor.jsx      # 行情监控
│   │   ├── StrategyManage.jsx     # 策略管理
│   │   └── TradeHistory.jsx       # 交易记录
│   ├── services/               # API服务
│   │   └── api.js                 # API接口定义
│   ├── utils/                  # 工具函数
│   │   ├── constants.js           # 常量配置
│   │   └── format.js              # 格式化函数
│   ├── styles/                 # 样式文件
│   │   └── global.css             # 全局样式
│   ├── App.jsx                 # 根组件
│   └── main.jsx                # 入口文件
├── KNOWLEDGE_BASE_CONFIG.md    # 知识库配置说明文档
├── index.html                  # HTML模板
├── vite.config.js              # Vite配置
└── package.json                # 项目配置
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
cd quant_trade_web
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录

### 预览生产版本

```bash
npm run preview
```

## 页面说明

### 1. 仪表盘 (Dashboard)
- 展示账户总资产、今日收益、累计收益率、胜率等核心指标
- 累计收益曲线图
- 资产分布饼图
- 策略运行状态进度条
- 当前持仓列表

### 2. 行情监控 (Market Monitor)
- 实时报价表格，支持排序筛选
- 完整的K线图展示，包含成交量
- 支持缩放、拖拽等交互操作
- 股票搜索和板块筛选功能

### 3. 策略管理 (Strategy Manage)
- 策略列表展示，包含收益率、胜率、最大回撤等指标
- 策略启停控制
- 新增策略功能（支持多种策略类型）
- 策略详情查看
- 策略收益对比图表

### 4. 交易记录 (Trade History)
- 交易记录列表,支持按时间、策略、方向筛选
- 今日交易统计(交易次数、成交额、盈亏、胜率)
- 每日盈亏柱状图
- 交易次数分布饼图

### 5. 知识库 (Knowledge Base)
- 点击顶部导航栏的书本图标打开知识库
- 支持多层级树状结构目录导航
- iframe嵌入式网页内容展示
- 四大功能:
  - 展示/隐藏目录树
  - 在新窗口中打开当前内容
  - 全屏/退出全屏显示
  - 关闭知识库面板
- macOS风格界面设计
- 支持自定义配置知识库内容(详见 [知识库配置说明](./KNOWLEDGE_BASE_CONFIG.md))

## API接口

后端API需要实现以下接口（代理到 http://localhost:8000）：

### 仪表盘
- `GET /dashboard` - 获取仪表盘数据
- `GET /account/info` - 获取账户信息
- `GET /positions` - 获取持仓列表

### 行情
- `GET /market/realtime` - 获取实时行情
- `GET /market/kline/:symbol` - 获取K线数据
- `GET /market/search` - 搜索股票

### 策略
- `GET /strategies` - 获取策略列表
- `POST /strategies` - 创建策略
- `PUT /strategies/:id` - 更新策略
- `DELETE /strategies/:id` - 删除策略
- `POST /strategies/:id/start` - 启动策略
- `POST /strategies/:id/stop` - 停止策略
- `GET /strategies/:id` - 获取策略详情

### 交易
- `GET /trades` - 获取交易记录
- `GET /trades/statistics` - 获取交易统计
- `POST /trades/order` - 手动下单

## 配置说明

### 代理配置
在 `vite.config.js` 中配置了开发环境的API代理：

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

### 路径别名
配置了 `@` 作为 `src` 目录的别名：

```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

使用示例：
```javascript
import api from '@/services/api'
import { formatCurrency } from '@/utils/format'
```

## 开发指南

### 添加新页面
1. 在 `src/pages/` 创建新的页面组件
2. 在 `src/App.jsx` 中添加路由配置
3. 在 `src/components/MainLayout.jsx` 的菜单配置中添加导航项

### 添加新的API接口
在 `src/services/api.js` 中按模块添加接口定义：

```javascript
export const newModuleAPI = {
  getList: () => api.get('/new-module'),
  create: (data) => api.post('/new-module', data),
}
```

### 工具函数
`src/utils/format.js` 提供了常用的格式化函数：
- `formatCurrency` - 货币格式化
- `formatPercent` - 百分比格式化
- `formatLargeNumber` - 大数字格式化（万、亿）
- `formatDateTime` - 日期时间格式化
- `getChangeColor` - 获取涨跌颜色

## 注意事项

1. **数据mock**: 当前使用的是模拟数据，实际使用需要对接真实的后端API
2. **认证**: 已在axios拦截器中预留了token处理逻辑，需根据实际情况调整
3. **WebSocket**: 实时行情建议使用WebSocket连接，可参考 `constants.js` 中的消息类型定义
4. **错误处理**: 已配置全局错误拦截，根据需要可以自定义错误处理逻辑

## 后续优化建议

- [ ] 接入真实的行情数据API
- [ ] 实现WebSocket实时推送
- [ ] 添加用户认证和权限管理
- [ ] 增加更多技术指标图表（MACD、KDJ等）
- [ ] 实现策略回测功能
- [ ] 添加风险控制模块
- [ ] 移动端适配优化
- [ ] 增加单元测试

## License

MIT
