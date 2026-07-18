import { create } from 'zustand';
import { MindMapData, MindMapNode } from '../types';
import { calculateLayout } from '../utils/layout';
import { deleteNodeAndChildren } from '../utils/nodeOperations';

export interface MindMapState {
  data: MindMapData;
  setData: (data: MindMapData | ((prev: MindMapData) => MindMapData)) => void;
  isLoaded: boolean;
  setIsLoaded: (isLoaded: boolean) => void;
  isMapVisible: boolean;
  setIsMapVisible: (visible: boolean) => void;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
  nodeIdToDelete: string | null;
  setNodeIdToDelete: (id: string | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  generationError: Error | null;
  setGenerationError: (error: Error | null) => void;
  isNoteChatLoading: boolean;
  setIsNoteChatLoading: (isLoading: boolean) => void;
  paywallReason: 'insufficient_credits' | 'add_credits' | null;
  setPaywallReason: (reason: 'insufficient_credits' | 'add_credits' | null) => void;
  isNoteModalVisible: boolean;
  setIsNoteModalVisible: (visible: boolean) => void;
  isSidebarVisible: boolean;
  setIsSidebarVisible: (visible: boolean) => void;
  pendingNodeId: string | null;
  setPendingNodeId: (id: string | null) => void;

  // Actions
  handleAddManualNode: (label: string, parentId: string | null) => void;
  handleUpdateNodeNote: (id: string, note: string, images?: string[]) => void;
  handleRenameNode: (id: string, newLabel: string) => void;
  handleToggleCollapse: (id: string, isCollapsed: boolean) => void;
  confirmDeleteNode: () => void;
  cancelDeleteNode: () => void;
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  data: { nodes: [], edges: [] },
  setData: (updater) => set((state) => ({
    data: typeof updater === 'function' ? updater(state.data) : updater
  })),
  isLoaded: false,
  setIsLoaded: (isLoaded) => set({ isLoaded }),
  isMapVisible: false,
  setIsMapVisible: (isMapVisible) => set({ isMapVisible }),
  activeNodeId: null,
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  nodeIdToDelete: null,
  setNodeIdToDelete: (nodeIdToDelete) => set({ nodeIdToDelete }),
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  generationError: null,
  setGenerationError: (generationError) => set({ generationError }),
  isNoteChatLoading: false,
  setIsNoteChatLoading: (isNoteChatLoading) => set({ isNoteChatLoading }),
  paywallReason: null,
  setPaywallReason: (paywallReason) => set({ paywallReason }),
  isNoteModalVisible: false,
  setIsNoteModalVisible: (isNoteModalVisible) => set({ isNoteModalVisible }),
  isSidebarVisible: false,
  setIsSidebarVisible: (isSidebarVisible) => set({ isSidebarVisible }),
  pendingNodeId: null,
  setPendingNodeId: (pendingNodeId) => set({ pendingNodeId }),

  handleAddManualNode: (label: string, parentId: string | null) => {
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

  handleUpdateNodeNote: (id: string, note: string, images?: string[]) => {
    set((state) => {
      const newNodes = state.data.nodes.map(node =>
        node.id === id ? { ...node, note, ...(images && { images }) } : node
      );
      return { data: { ...state.data, nodes: newNodes } };
    });
  },

  handleRenameNode: (id: string, newLabel: string) => {
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

  handleToggleCollapse: (id: string, isCollapsed: boolean) => {
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
}));
