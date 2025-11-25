// 指标说明配置 - 统一管理所有指标文档
// 动态导入 markdown 文件
import MA_MD from './MA.md?raw'
import EMA_MD from './EMA.md?raw'
import BOLL_MD from './BOLL.md?raw'
import KDJ_MD from './KDJ.md?raw'
import MACD_MD from './MACD.md?raw'
import RSI_MD from './RSI.md?raw'
import WR_MD from './WR.md?raw'
import DMI_MD from './DMI.md?raw'
import CCI_MD from './CCI.md?raw'
import BIAS_MD from './BIAS.md?raw'

// 指标文档映射配置
export const indicatorDescriptions = {
  MA5: MA_MD,
  MA10: MA_MD,
  MA20: MA_MD,
  EMA12: EMA_MD,
  EMA26: EMA_MD,
  BOLL: BOLL_MD,
  KDJ: KDJ_MD,
  MACD: MACD_MD,
  RSI: RSI_MD,
  WR: WR_MD,
  DMI: DMI_MD,
  CCI: CCI_MD,
  BIAS: BIAS_MD,
}

// 指标知识库文档节点 ID 配置
export const indicatorDocsId = {
  MA5: 'indicator_ma',
  MA10: 'indicator_ma',
  MA20: 'indicator_ma',
  EMA12: 'indicator_ema',
  EMA26: 'indicator_ema',
  BOLL: 'indicator_boll',
  KDJ: 'indicator_kdj',
  MACD: 'indicator_macd',
  RSI: 'indicator_rsi',
  WR: 'indicator_wr',
  DMI: 'indicator_dmi',
  CCI: 'indicator_cci',
  BIAS: 'indicator_bias',
}

// 弹出框统一配置
export const popoverConfig = {
  width: '380px',
  fontSize: '11px',
  lineHeight: '1.6',
}
