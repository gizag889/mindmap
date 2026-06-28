import { MindMapNode, MindMapEdge } from "../types";

export function calculateLayout(nodes: MindMapNode[], edges: MindMapEdge[], rootId: string) {
  // Simple radial layout
  const layoutedNodes = [...nodes];
  
  const rootIndex = layoutedNodes.findIndex(n => n.id === rootId);
  if (rootIndex === -1) return layoutedNodes;

  // 初期状態として全ノードを非表示にし、走査されたものだけを表示する
  layoutedNodes.forEach((node, idx) => {
    layoutedNodes[idx] = { ...node, isHidden: true };
  });

  layoutedNodes[rootIndex] = { ...layoutedNodes[rootIndex], x: 0, y: 0, isHidden: false };

  const getChildren = (parentId: string) => layoutedNodes.filter(n => n.parentId === parentId);
  
  const assignPositions = (nodeId: string, currentRadius: number, startAngle: number, endAngle: number) => {
    const node = layoutedNodes.find(n => n.id === nodeId);
    // ノードが折りたたまれている場合は子ノードの配置処理を行わない（非表示のままになる）
    if (!node || node.isCollapsed) return;

    const children = getChildren(nodeId);
    if (children.length === 0) return;

    const angleStep = (endAngle - startAngle) / children.length;
    
    // ノードのテキスト長可変化に伴い、ノード同士が重ならないよう最低限必要な弧の長さを確保
    // 子ノードの中で最大のテキスト長を取得して必要な弧の長さを動的に計算
    const maxLabelLength = children.reduce((max, child) => Math.max(max, (child.label || "").length), 0);
    const minArcLength = Math.max(30, maxLabelLength * 20 + 40); 
    const requiredRadiusForSpacing = children.length > 1 ? minArcLength / angleStep : 0;
    
    // 基本の階層間距離（ピボットからの派生ノードの場合は距離を短くする）
    const isPivot = node.type === 'ai_pivot';
    const radiusIncrement = isPivot ? 10 : 100;
    const baseRadius = currentRadius + radiusIncrement; 
    const radius = Math.max(baseRadius, requiredRadiusForSpacing);

    // マインドマップを放射状（サークル状）に自動配置するための再帰処理
    children.forEach((child, index) => {
      const childAngle = startAngle + angleStep * index + angleStep / 2;
      const childIndex = layoutedNodes.findIndex(n => n.id === child.id);
      
      layoutedNodes[childIndex] = {
        ...layoutedNodes[childIndex],
        x: radius * Math.cos(childAngle),
        y: radius * Math.sin(childAngle),
        isHidden: false,
      };

      // 子ノードへ処理を進める
      assignPositions(child.id, radius, startAngle + angleStep * index, startAngle + angleStep * (index + 1));
    });
  };

  // ルートノードを起点に、0 から 2π（360度）の範囲で配置を開始する
  assignPositions(rootId, 0, 0, Math.PI * 2);

  // If there are nodes without parent (disconnected or multiple roots), we just place them randomly or skip.
  return layoutedNodes;
}
