// 知识库树状结构配置
export const knowledgeBaseConfig = [
    {
        id: 'finance',
        title: '金融｜finance',
        children: [
            {
                id: 'finance_1',
                title: '股票量化交易数据全景分类体系',
                url: "https://www.yuque.com/u32034952/wxggbp/xoyn29gdind133vi?singleDoc#",
                children: [
                    {
                        id: 'finance_1_1',
                        title: 'Chapter 1 基础标识与时间数据',
                        url: "https://www.yuque.com/u32034952/wxggbp/kdy614lg57tvnit1?singleDoc#",
                        children: [
                            {
                                id: 'finance_1_1_!',
                                title: '证券标识体系y',
                                url: "https://www.yuque.com/u32034952/wxggbp/zphqcxgmkyn18ul7?singleDoc#",
                                children: [
                                    {
                                        id: 'finance_1_1_1_1',
                                        title: '基础代码',
                                        url: "https://www.yuque.com/u32034952/wxggbp/mgree84kowgmcslb?singleDoc#",
                                        children: [
                                            {
                                                id: 'finance_1_1_1_1_1',
                                                title: '交易所代码',
                                                url: "https://www.yuque.com/u32034952/wxggbp/gacc5scryx07zicx?singleDoc#"
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'economy',
        title: '经济｜economy',
        children: []
    },
    {
        id: 'math',
        title: '数学｜math',
        children: []
    },
    {
        id: 'programing',
        title: '编程｜programing',
        children: []
    }
]
