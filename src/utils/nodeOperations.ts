import { MindMapData, MindMapNode } from '../types';
import { calculateLayout } from './layout';

export function deleteNodeAndChildren(data: MindMapData, idToDelete: string): MindMapData {
  const idsToDelete = new Set<string>();
  const queue = [idToDelete];
  
  while (queue.length > 0) {
    //削除対象の現在のノードIDを取得します。 この末尾の ! は「Non-null assertion operator（非nullアサーション演算子）」
    const currentId = queue.shift()!;
    //IDがもし存在しない場合はスキップ
    if (!currentId) continue;
    //セットに追加して、削除対象リストに記録
    idsToDelete.add(currentId);
    //現在処理しているノードの子ノードを全て検索
    const children = data.nodes.filter(n => n.parentId === currentId);
    children.forEach(c => queue.push(c.id));
  }
//idsToDeleteに含まれないノードだけを残す
  const newNodes = data.nodes.filter(n => !idsToDelete.has(n.id));
  
  const newEdges = data.edges.filter(
    e => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
  );

  let rootId = null;
  //削除後のノード配列が空でない場合、レイアウト再構成のためにルートノードを特定します。
  if (newNodes.length > 0) {
    rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0].id;
  }
  
  const layoutedNodes = rootId ? calculateLayout(newNodes, newEdges, rootId) : [];

  return {
    nodes: layoutedNodes,
    edges: newEdges,
  };
}

export function addManualNode(data: MindMapData, label: string, parentId: string | null): MindMapData {
  const newNodeId = `manual_${Date.now()}`;
  const newNode: MindMapNode = {
    id: newNodeId,
    label: label.trim(),
    parentId: parentId,
  };
  const newNodes = [...data.nodes, newNode];
  const newEdges = [...data.edges];
  if (parentId) {
    newEdges.push({ source: parentId, target: newNodeId });
  }
  const rootId = data.nodes.length > 0 ? data.nodes[0].id : newNodeId;
  const layoutedNodes = calculateLayout(newNodes, newEdges, rootId);
  return { nodes: layoutedNodes, edges: newEdges };
}

export function updateNodeNote(data: MindMapData, id: string, note: string, images?: string[]): MindMapData {
  const newNodes = data.nodes.map(node =>
    node.id === id ? { ...node, note, ...(images && { images }) } : node
  );
  return { ...data, nodes: newNodes };
}

export function renameNode(data: MindMapData, id: string, newLabel: string): MindMapData {
  const newNodes = data.nodes.map(node =>
    node.id === id ? { ...node, label: newLabel.trim() } : node
  );
  const rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0]?.id;
  const layoutedNodes = rootId ? calculateLayout(newNodes, data.edges, rootId) : newNodes;
  return { ...data, nodes: layoutedNodes };
}

export function toggleNodeCollapse(data: MindMapData, id: string, isCollapsed: boolean): MindMapData {
  const newNodes = data.nodes.map(n => 
    n.id === id ? { ...n, isCollapsed } : n
  );
  const rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0]?.id;
  const layoutedNodes = rootId ? calculateLayout(newNodes, data.edges, rootId) : newNodes;
  return { ...data, nodes: layoutedNodes };
}
