import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react'
import { Tree } from 'antd'
import { BookOutlined, FileTextOutlined } from '@ant-design/icons'
import './KnowledgeBaseTree.css'

// 递归转换配置数据为 Tree 组件需要的格式
const convertToTreeData = (data) => {
  return data.map((item) => ({
    key: item.id,
    title: item.title,
    icon: item.children && item.children.length > 0 ? <BookOutlined /> : <FileTextOutlined />,
    url: item.url,
    id: item.id,
    children: item.children ? convertToTreeData(item.children) : undefined,
  }))
}

// 递归获取所有节点的key
const getAllKeys = (data) => {
  const keys = []
  const traverse = (nodes) => {
    nodes.forEach((node) => {
      keys.push(node.key)
      if (node.children) {
        traverse(node.children)
      }
    })
  }
  traverse(data)
  return keys
}

// 递归查找节点路径
const findNodePath = (data, targetKey, path = []) => {
  for (const node of data) {
    const currentPath = [...path, node.key]
    if (node.key === targetKey) {
      return currentPath
    }
    if (node.children) {
      const found = findNodePath(node.children, targetKey, currentPath)
      if (found) return found
    }
  }
  return null
}

const KnowledgeBaseTree = forwardRef(({ data, onSelect, selectedKey }, ref) => {
  const treeData = convertToTreeData(data)
  const [expandedKeys, setExpandedKeys] = useState([])
  const [selectedKeys, setSelectedKeys] = useState([])
  const treeRef = useRef(null)

  // 默认展开第一层
  useEffect(() => {
    if (treeData.length > 0) {
      setExpandedKeys([treeData[0].key])
    }
  }, [])

  // 同步选中状态
  useEffect(() => {
    if (selectedKey) {
      setSelectedKeys([selectedKey])
    }
  }, [selectedKey])

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    expandAll: () => {
      const allKeys = getAllKeys(treeData)
      setExpandedKeys(allKeys)
    },
    collapseAll: () => {
      setExpandedKeys([])
    },
    locateNode: (nodeKey) => {
      const path = findNodePath(treeData, nodeKey)
      if (path) {
        setExpandedKeys(path)
        setSelectedKeys([nodeKey])
        // 滚动到节点位置
        setTimeout(() => {
          const element = document.querySelector(`[data-key="${nodeKey}"]`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    },
  }))

  const handleSelect = (selectedKeys, info) => {
    if (selectedKeys.length > 0 && info.node.url) {
      setSelectedKeys(selectedKeys)
      onSelect({
        id: info.node.id,
        title: info.node.title,
        url: info.node.url,
      })
    }
  }

  const handleExpand = (expandedKeys) => {
    setExpandedKeys(expandedKeys)
  }

  return (
    <div className="knowledge-base-tree">
      <Tree
        ref={treeRef}
        showIcon
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        onExpand={handleExpand}
        treeData={treeData}
        onSelect={handleSelect}
        className="custom-tree"
      />
    </div>
  )
})

KnowledgeBaseTree.displayName = 'KnowledgeBaseTree'

export default KnowledgeBaseTree
