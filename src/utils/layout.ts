import { MindMapNode, MindMapEdge } from "../types";

export function calculateLayout(nodes: MindMapNode[], edges: MindMapEdge[], rootId: string) {
  // Simple radial layout
  const layoutedNodes = [...nodes];
  
  const rootIndex = layoutedNodes.findIndex(n => n.id === rootId);
  if (rootIndex === -1) return layoutedNodes;

  layoutedNodes[rootIndex] = { ...layoutedNodes[rootIndex], x: 0, y: 0 };

  const getChildren = (parentId: string) => layoutedNodes.filter(n => n.parentId === parentId);
  
  const assignPositions = (nodeId: string, depth: number, startAngle: number, endAngle: number) => {
    const children = getChildren(nodeId);
    if (children.length === 0) return;

    const angleStep = (endAngle - startAngle) / children.length;
    const radius = depth * 150; // 150px per depth level

    children.forEach((child, index) => {
      const childAngle = startAngle + angleStep * index + angleStep / 2;
      const childIndex = layoutedNodes.findIndex(n => n.id === child.id);
      
      layoutedNodes[childIndex] = {
        ...layoutedNodes[childIndex],
        x: radius * Math.cos(childAngle),
        y: radius * Math.sin(childAngle),
      };

      // Spread children over the allocated angle range
      assignPositions(child.id, depth + 1, startAngle + angleStep * index, startAngle + angleStep * (index + 1));
    });
  };

  // Start with root, full circle
  assignPositions(rootId, 1, 0, Math.PI * 2);

  // If there are nodes without parent (disconnected or multiple roots), we just place them randomly or skip.
  return layoutedNodes;
}
