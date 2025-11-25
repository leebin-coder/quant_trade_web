# 指标文档配置说明

## 目录结构

```
indicators/
├── index.js          # 统一配置文件（动态导入 markdown 文件）
├── README.md         # 本说明文档
├── MA.md            # 移动平均线文档（MA5/MA10/MA20 共用）
├── EMA.md           # 指数移动平均线文档（EMA12/EMA26 共用）
├── BOLL.md          # 布林带文档
├── KDJ.md           # KDJ 指标文档
├── MACD.md          # MACD 指标文档
├── RSI.md           # RSI 指标文档
├── WR.md            # 威廉指标文档
├── DMI.md           # DMI 指标文档
├── CCI.md           # CCI 指标文档
└── BIAS.md          # 乖离率文档
```

## 配置说明

### index.js 配置文件

`index.js` 是统一的配置入口，包含三个主要配置：

```javascript
// 1. 导入 markdown 文件
import MA_MD from './MA.md?raw'
import EMA_MD from './EMA.md?raw'
// ...

// 2. 指标文档映射
export const indicatorDescriptions = {
  MA5: MA_MD,    // 使用 MA.md 的内容
  MA10: MA_MD,   // 使用 MA.md 的内容
  MA20: MA_MD,   // 使用 MA.md 的内容
  EMA12: EMA_MD, // 使用 EMA.md 的内容
  // ...
}

// 3. 知识库文档链接配置
export const indicatorDocsUrl = {
  MA5: 'https://example.com/docs/indicators/ma#ma5',
  MA10: 'https://example.com/docs/indicators/ma#ma10',
  // ... 配置每个指标的文档 URL
}

// 4. 弹出框样式配置
export const popoverConfig = {
  width: '380px',
  fontSize: '11px',
  lineHeight: '1.6',
}
```

### 如何修改指标文档

1. **修改现有指标内容**
   - 直接编辑对应的 `.md` 文件（如 `MA.md`）
   - 保存后 Vite 会自动热更新，无需重启服务

2. **修改知识库链接**
   - 编辑 `index.js` 中的 `indicatorDocsUrl` 对象
   - 将 URL 替换为实际的知识库文档地址
   - 支持锚点定位（如 `#ma5`）

3. **修改弹出框样式**
   - 编辑 `index.js` 中的 `popoverConfig` 对象
   - 可配置项：
     - `width`: 弹出框宽度
     - `fontSize`: 字体大小
     - `lineHeight`: 行高

4. **添加新指标**
   - 创建新的 `.md` 文件（如 `NEW.md`）
   - 在 `index.js` 中添加导入：`import NEW_MD from './NEW.md?raw'`
   - 在 `indicatorDescriptions` 中添加映射：`NEW: NEW_MD`
   - 在 `indicatorDocsUrl` 中添加链接：`NEW: 'https://...'`
   - 在 `StockChart.jsx` 中添加对应的 Checkbox 组件

## Markdown 文件格式

每个 markdown 文件应包含：

```markdown
# 指标名称 (英文全称)

简要说明

## 计算方法

计算公式和说明

## 使用方法

1. **要点1**: 说明
2. **要点2**: 说明
3. **要点3**: 说明
```

## 优势

1. **内容与代码分离**: markdown 文件独立维护，易于编辑
2. **动态导入**: 使用 Vite 的 `?raw` 导入，编译时处理
3. **统一配置**: 所有指标和样式配置集中在 `index.js`
4. **热更新**: 修改 markdown 文件后自动刷新，无需重启
5. **易于扩展**: 添加新指标只需三步（创建文件、导入、映射）
