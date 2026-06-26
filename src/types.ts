export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  parentId: string | null;
  x?: number;
  y?: number;
  note?: string;
  chatHistory?: ChatMessage[];
  type?: 'default' | 'ai_pivot';
  promptText?: string;
  isCollapsed?: boolean;
  isHidden?: boolean;
  images?: string[];
}

export interface MindMapEdge {
  source: string;
  target: string;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface MindMapPage {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
}
