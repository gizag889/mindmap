import { create, StateCreator } from 'zustand';
import { MindMapData, MindMapNode } from '../types';
import { calculateLayout } from '../utils/layout';
import { deleteNodeAndChildren } from '../utils/nodeOperations';

// -----------------------------
// 1. Data Slice (コアデータと操作)
// -----------------------------
export interface DataSlice {
  data: MindMapData;
  setData: (data: MindMapData | ((prev: MindMapData) => MindMapData)) => void;
  
  handleAddManualNode: (label: string, parentId: string | null) => void;
  handleUpdateNodeNote: (id: string, note: string, images?: string[]) => void;
  handleRenameNode: (id: string, newLabel: string) => void;
  handleToggleCollapse: (id: string, isCollapsed: boolean) => void;
  confirmDeleteNode: () => void;
  cancelDeleteNode: () => void;
}

const createDataSlice: StateCreator<MindMapState, [], [], DataSlice> = (set, get) => ({
  data: { nodes: [], edges: [] },
  setData: (updater) => set((state) => ({
    data: typeof updater === 'function' ? updater(state.data) : updater
  })),

  handleAddManualNode: (label, parentId) => {
    if (!label.trim()) return;
    set((state) => {
      const newNodeId = `manual_${Date.now()}`;
      const newNode: MindMapNode = {
        id: newNodeId,
        label: label.trim(),
        parentId: parentId,
      };
      const newNodes = [...state.data.nodes, newNode];
      const newEdges = [...state.data.edges];
      if (parentId) {
        newEdges.push({ source: parentId, target: newNodeId });
      }
      const rootId = state.data.nodes.length > 0 ? state.data.nodes[0].id : newNodeId;
      const layoutedNodes = calculateLayout(newNodes, newEdges, rootId);
      
      return {
        data: { nodes: layoutedNodes, edges: newEdges },
        isMapVisible: true,
      };
    });
  },

  handleUpdateNodeNote: (id, note, images) => {
    set((state) => {
      const newNodes = state.data.nodes.map(node =>
        node.id === id ? { ...node, note, ...(images && { images }) } : node
      );
      return { data: { ...state.data, nodes: newNodes } };
    });
  },

  handleRenameNode: (id, newLabel) => {
    if (!newLabel.trim()) return;
    set((state) => {
      const newNodes = state.data.nodes.map(node =>
        node.id === id ? { ...node, label: newLabel.trim() } : node
      );
      const rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0]?.id;
      const layoutedNodes = rootId ? calculateLayout(newNodes, state.data.edges, rootId) : newNodes;
      return { data: { ...state.data, nodes: layoutedNodes } };
    });
  },

  handleToggleCollapse: (id, isCollapsed) => {
    set((state) => {
      const newNodes = state.data.nodes.map(n => 
        n.id === id ? { ...n, isCollapsed } : n
      );
      const rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0]?.id;
      const layoutedNodes = rootId ? calculateLayout(newNodes, state.data.edges, rootId) : newNodes;
      return { data: { ...state.data, nodes: layoutedNodes } };
    });
  },

  confirmDeleteNode: () => {
    set((state) => {
      const { nodeIdToDelete, activeNodeId, data } = state;
      if (!nodeIdToDelete) return state;

      const newData = deleteNodeAndChildren(data, nodeIdToDelete);
      
      return {
        data: newData,
        activeNodeId: activeNodeId === nodeIdToDelete ? null : activeNodeId,
        nodeIdToDelete: null,
      };
    });
  },

  cancelDeleteNode: () => {
    set({ nodeIdToDelete: null });
  },
});

// -----------------------------
// 2. UI Slice (表示状態やモーダル)
// -----------------------------
export interface UISlice {
  isMapVisible: boolean;
  setIsMapVisible: (visible: boolean) => void;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
  nodeIdToDelete: string | null;
  setNodeIdToDelete: (id: string | null) => void;
  pendingNodeId: string | null;
  setPendingNodeId: (id: string | null) => void;
  isNoteModalVisible: boolean;
  setIsNoteModalVisible: (visible: boolean) => void;
  isSidebarVisible: boolean;
  setIsSidebarVisible: (visible: boolean) => void;
  paywallReason: 'insufficient_credits' | 'add_credits' | null;
  setPaywallReason: (reason: 'insufficient_credits' | 'add_credits' | null) => void;
}

const createUISlice: StateCreator<MindMapState, [], [], UISlice> = (set) => ({
  isMapVisible: false,
  setIsMapVisible: (isMapVisible) => set({ isMapVisible }),
  activeNodeId: null,
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  nodeIdToDelete: null,
  setNodeIdToDelete: (nodeIdToDelete) => set({ nodeIdToDelete }),
  pendingNodeId: null,
  setPendingNodeId: (pendingNodeId) => set({ pendingNodeId }),
  isNoteModalVisible: false,
  setIsNoteModalVisible: (isNoteModalVisible) => set({ isNoteModalVisible }),
  isSidebarVisible: false,
  setIsSidebarVisible: (isSidebarVisible) => set({ isSidebarVisible }),
  paywallReason: null,
  setPaywallReason: (paywallReason) => set({ paywallReason }),
});

// -----------------------------
// 3. Async Slice (読み込み・生成状態)
// -----------------------------
export interface AsyncSlice {
  isLoaded: boolean;
  setIsLoaded: (isLoaded: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  generationError: Error | null;
  setGenerationError: (error: Error | null) => void;
  isNoteChatLoading: boolean;
  setIsNoteChatLoading: (isLoading: boolean) => void;
}

const createAsyncSlice: StateCreator<MindMapState, [], [], AsyncSlice> = (set) => ({
  isLoaded: false,
  setIsLoaded: (isLoaded) => set({ isLoaded }),
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  generationError: null,
  setGenerationError: (generationError) => set({ generationError }),
  isNoteChatLoading: false,
  setIsNoteChatLoading: (isNoteChatLoading) => set({ isNoteChatLoading }),
});

// -----------------------------
// Combined Store
// -----------------------------
export type MindMapState = DataSlice & UISlice & AsyncSlice;

export const useMindMapStore = create<MindMapState>()((...a) => ({
  ...createDataSlice(...a),
  ...createUISlice(...a),
  ...createAsyncSlice(...a),
}));
