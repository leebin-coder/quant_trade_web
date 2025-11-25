import { createContext, useContext, useState } from 'react'
import { knowledgeBaseConfig } from '../config/knowledgeBase'

const KnowledgeBaseContext = createContext()

// 递归查找指定ID的节点
const findNodeById = (nodes, targetId) => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node
    }
    if (node.children) {
      const found = findNodeById(node.children, targetId)
      if (found) return found
    }
  }
  return null
}

export function KnowledgeBaseProvider({ children }) {
  const [visible, setVisible] = useState(false)
  const [targetNodeId, setTargetNodeId] = useState(null)

  const openKnowledge = (nodeId) => {
    if (nodeId) {
      const node = findNodeById(knowledgeBaseConfig, nodeId)
      if (node) {
        setTargetNodeId(nodeId)
        setVisible(true)
      }
    } else {
      setVisible(true)
    }
  }

  const closeKnowledge = () => {
    setVisible(false)
    // 延迟清除 targetNodeId，以便面板关闭动画完成
    setTimeout(() => setTargetNodeId(null), 300)
  }

  return (
    <KnowledgeBaseContext.Provider
      value={{
        visible,
        targetNodeId,
        openKnowledge,
        closeKnowledge,
      }}
    >
      {children}
    </KnowledgeBaseContext.Provider>
  )
}

export function useKnowledgeBase() {
  const context = useContext(KnowledgeBaseContext)
  if (!context) {
    throw new Error('useKnowledgeBase must be used within KnowledgeBaseProvider')
  }
  return context
}
