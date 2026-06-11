export interface MindMapNode {
  id: string;
  label: string;
  parentId: string | null;
  x?: number;
  y?: number;
}

export interface MindMapEdge {
  source: string;
  target: string;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}
