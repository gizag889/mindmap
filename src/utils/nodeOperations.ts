import { MindMapData } from '../types';
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
