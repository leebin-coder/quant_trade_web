// 知识库配置示例文件
// 复制此文件为 knowledgeBase.js 并修改为你自己的内容

export const knowledgeBaseConfig = [
  {
    id: '1',
    title: '第一章:示例章节',
    url: 'https://example.com/chapter1',
    children: [
      {
        id: '1-1',
        title: '1.1 第一节',
        url: 'https://example.com/section1-1',
        children: [
          {
            id: '1-1-1',
            title: '子主题1',
            url: 'https://example.com/topic1-1-1',
          },
          {
            id: '1-1-2',
            title: '子主题2',
            url: 'https://example.com/topic1-1-2',
          }
        ]
      },
      {
        id: '1-2',
        title: '1.2 第二节',
        url: 'https://example.com/section1-2',
      }
    ]
  },
  {
    id: '2',
    title: '第二章:另一个章节',
    url: 'https://example.com/chapter2',
    children: [
      {
        id: '2-1',
        title: '2.1 基础内容',
        url: 'https://example.com/section2-1',
      },
      {
        id: '2-2',
        title: '2.2 进阶内容',
        url: 'https://example.com/section2-2',
      }
    ]
  }
]
