# 知识库配置说明

## 概述

知识库功能允许你在应用中嵌入自定义的知识库内容,支持树状结构导航和网页内容展示。

## 配置文件位置

配置文件位于: `src/config/knowledgeBase.js`

## 配置结构

```javascript
export const knowledgeBaseConfig = [
  {
    id: '唯一标识符',
    title: '节点标题',
    url: '对应的网页URL',
    children: [
      // 子节点,结构与父节点相同
      {
        id: '子节点ID',
        title: '子节点标题',
        url: '子节点URL',
        children: [...]
      }
    ]
  }
]
```

## 配置字段说明

- `id` (必填): 节点的唯一标识符,用于树形控件的key
- `title` (必填): 在树形目录中显示的标题
- `url` (必填): 点击该节点时要展示的网页地址
- `children` (可选): 子节点数组,可以嵌套多层

## 使用示例

```javascript
export const knowledgeBaseConfig = [
  {
    id: '1',
    title: '第一章:基础知识',
    url: 'https://example.com/chapter1',
    children: [
      {
        id: '1-1',
        title: '1.1 入门指南',
        url: 'https://example.com/chapter1-1',
        children: [
          {
            id: '1-1-1',
            title: '安装说明',
            url: 'https://example.com/install'
          },
          {
            id: '1-1-2',
            title: '快速开始',
            url: 'https://example.com/quickstart'
          }
        ]
      }
    ]
  },
  {
    id: '2',
    title: '第二章:高级特性',
    url: 'https://example.com/chapter2',
    children: [...]
  }
]
```

## 功能特性

### 1. 树状结构导航
- 点击顶部工具栏的"目录"按钮(列表图标)可打开左侧树状导航
- 支持多层级嵌套
- 点击任意节点即可在右侧展示对应内容

### 2. 内容展示
- 使用iframe嵌入展示网页内容
- 占主页面的90%宽高(非全屏模式)
- 支持滚动查看超出部分的内容
- 滚动条细小,符合macOS风格

### 3. 工具栏功能
- **目录按钮**: 展开/收起左侧树状结构
- **新窗口按钮**: 在浏览器新标签页中打开当前内容
- **全屏按钮**: 切换全屏/正常模式显示
  - 全屏时占据整个浏览器窗口
  - 按ESC键可退出全屏
- **关闭按钮**: 关闭知识库面板

### 4. 访问入口
- 点击顶部导航栏的书本图标(📖)打开知识库
- 图标位于用户信息左侧

## 样式特点

- 采用macOS风格设计
- 圆角卡片布局
- 流畅的动画过渡效果
- 毛玻璃背景效果
- 细窄的滚动条设计

## 注意事项

1. **跨域问题**: 某些网站可能不允许在iframe中展示,会显示空白。建议使用支持iframe嵌入的网站或自建内容服务。

2. **网址有效性**: 请确保配置的URL是可访问的有效地址。

3. **ID唯一性**: 每个节点的id必须是唯一的,建议使用层级编号(如: 1, 1-1, 1-1-1)。

4. **性能考虑**: 树形结构层级不宜过深(建议不超过5层),节点数量不宜过多(建议单层不超过20个)。

## 自定义修改

如需修改知识库的外观或行为,可以编辑以下文件:

- `src/components/KnowledgeBasePanel.jsx` - 主面板组件
- `src/components/KnowledgeBasePanel.css` - 主面板样式
- `src/components/KnowledgeBaseTree.jsx` - 树形导航组件
- `src/components/KnowledgeBaseTree.css` - 树形导航样式
- `src/config/knowledgeBase.js` - 内容配置文件
