import { create, StateCreator } from 'zustand';
import { MindMapData } from '../types';
import { 
  deleteNodeAndChildren,
  addManualNode,
  updateNodeNote,
  renameNode,
  toggleNodeCollapse
} from '../utils/nodeOperations';

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

//MindMap:ストアの全体の型（他のSliceも含めたすべての状態） [],[]はミドルウェアの型で今回は空　DataSlice:のSlice自身が提供するデータと関数の型
const createDataSlice: StateCreator<MindMapState, [], [], DataSlice> = (set, get) => ({
  data: { nodes: [], edges: [] },
  //updater は、「単純な値」と「計算用の関数」のどちらが渡されても柔軟に受け止め、適切に処理を振り分けるための万能な受け皿
  setData: (updater) => set((state) => ({
    data: typeof updater === 'function' ? updater(state.data) : updater
  })),


//setDataでデータを直接書き換えるのではなく、addManualNodeなどの操作関数を使ってデータを更新する。
//なぜなら、ノードの追加や削除、更新が行われるたびに、全体のレイアウトを再計算する必要があるから。
  handleAddManualNode: (label, parentId) => {
    if (!label.trim()) return;
    
    set((state) => ({
      data: addManualNode(state.data, label, parentId),
      isMapVisible: true,
    }));
  },

  handleUpdateNodeNote: (id, note, images) => {
    set((state) => ({
      data: updateNodeNote(state.data, id, note, images)
    }));
  },

  handleRenameNode: (id, newLabel) => {
    if (!newLabel.trim()) return;
    set((state) => ({
      data: renameNode(state.data, id, newLabel)
    }));
  },

  handleToggleCollapse: (id, isCollapsed) => {
    set((state) => ({
      data: toggleNodeCollapse(state.data, id, isCollapsed)
    }));
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
  pivotModalNodeId: string | null;
  setPivotModalNodeId: (id: string | null) => void;
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
  pivotModalNodeId: null,
  setPivotModalNodeId: (pivotModalNodeId) => set({ pivotModalNodeId }),
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

//() が連続する書き方（カリー化と呼ばれます）をしていますが、これはTypeScriptのコンパイラが型（このStore全体の構造は MindMapState だよ、という情報）を正確に推論できるようにするためのZustand特有のテクニック
export const useMindMapStore = create<MindMapState>()((...a) => ({
  //(...a) は、「Zustandから渡される set, get, api をとりあえず a という1つの配列に全部まとめて受け取るよ」という意味
  //(...a) を使うことで、「とりあえず全Sliceに3つセットで投げておくから、あとは各Slice側で自由に必要な分だけ受け取ってね！」という統一ルール
  ...createDataSlice(...a),
  ...createUISlice(...a),
  ...createAsyncSlice(...a),
}));
