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
                                title: '证券标识体系',
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
            },
            {
                id: 'finance_2',
                title: '技术指标',
                url: "https://www.yuque.com/u32034952/wxggbp/indicators?singleDoc#",
                children: [
                    {
                        id: 'indicator_ma',
                        title: 'MA (移动平均线)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-ma?singleDoc#"
                    },
                    {
                        id: 'indicator_ema',
                        title: 'EMA (指数移动平均线)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-ema?singleDoc#"
                    },
                    {
                        id: 'indicator_boll',
                        title: 'BOLL (布林带)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-boll?singleDoc#"
                    },
                    {
                        id: 'indicator_kdj',
                        title: 'KDJ (随机指标)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-kdj?singleDoc#"
                    },
                    {
                        id: 'indicator_macd',
                        title: 'MACD (指数平滑异同移动平均线)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-macd?singleDoc#"
                    },
                    {
                        id: 'indicator_rsi',
                        title: 'RSI (相对强弱指标)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-rsi?singleDoc#"
                    },
                    {
                        id: 'indicator_wr',
                        title: 'WR (威廉指标)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-wr?singleDoc#"
                    },
                    {
                        id: 'indicator_dmi',
                        title: 'DMI (趋向指标)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-dmi?singleDoc#"
                    },
                    {
                        id: 'indicator_cci',
                        title: 'CCI (顺势指标)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-cci?singleDoc#"
                    },
                    {
                        id: 'indicator_bias',
                        title: 'BIAS (乖离率)',
                        url: "https://www.yuque.com/u32034952/wxggbp/indicator-bias?singleDoc#"
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
