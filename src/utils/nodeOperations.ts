import { MindMapData } from '../types';
import { calculateLayout } from './layout';

export function deleteNodeAndChildren(data: MindMapData, idToDelete: string): MindMapData {
  const idsToDelete = new Set<string>();
  const queue = [idToDelete];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (!currentId) continue;
    idsToDelete.add(currentId);
    const children = data.nodes.filter(n => n.parentId === currentId);
    children.forEach(c => queue.push(c.id));
  }

  const newNodes = data.nodes.filter(n => !idsToDelete.has(n.id));
  const newEdges = data.edges.filter(
    e => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
  );

  let rootId = null;
  if (newNodes.length > 0) {
    rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0].id;
  }
  
  const layoutedNodes = rootId ? calculateLayout(newNodes, newEdges, rootId) : [];

  return {
    nodes: layoutedNodes,
    edges: newEdges,
  };
}
