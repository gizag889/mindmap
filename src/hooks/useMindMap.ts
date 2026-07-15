import { useState, useCallback, useEffect, useMemo } from 'react';
import { MindMapData, MindMapNode, MindMapPage } from '../types';
import { calculateLayout } from '../utils/layout';
import { deleteNodeAndChildren } from '../utils/nodeOperations';
import { useMindMapStorage } from './useMindMapStorage';
import { useMindMapAI } from './useMindMapAI';
import { addActivityLog } from '../utils/activityLog';

export const useMindMap = (
  pageId: string | null,
  token: string | null,
  onUpdatePage?: (id: string, updates: Partial<MindMapPage>) => void,
  aiMode: 'flash' | 'pro' = 'flash'
) => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [nodeIdToDelete, setNodeIdToDelete] = useState<string | null>(null);

  // 1. AsyncStorage によるデータロード・セーブを管理するカスタムフック
  const { data, setData, isLoaded } = useMindMapStorage(pageId, onUpdatePage);

  // ページ切り替えやロード完了時のUI状態管理
  useEffect(() => {
    if (isLoaded) {
      if (data.nodes && data.nodes.length > 0) {
        setIsMapVisible(true);
      } else {
        setIsMapVisible(false);
      }
      setActiveNodeId(null);
    }
  }, [pageId, isLoaded]);

  // 2. AI API 通信およびチャット処理を管理するカスタムフック
  const {
    isGenerating,
    generationError,
    isNoteChatLoading,
    paywallReason,
    setPaywallReason,
    handleSendMessage,
    handleSendNoteChat,
  } = useMindMapAI({
    pageId,
    data,
    setData,
    isMapVisible,
    setIsMapVisible,
    setActiveNodeId,
    token,
    aiMode,
  });

  const handleAddManualNode = useCallback((label: string, parentId: string | null) => {
    if (!label.trim()) return;
    
    setData(prevData => {
      const newNodeId = `manual_${Date.now()}`;
      
      const newNode: MindMapNode = {
        id: newNodeId,
        label: label.trim(),
        parentId: parentId,
      };
      
      const newNodes = [...prevData.nodes, newNode];
      
      let newEdges = [...prevData.edges];

      if (parentId) {
        newEdges.push({ source: parentId, target: newNodeId });
      }
      
      const rootId = prevData.nodes.length > 0 ? prevData.nodes[0].id : newNodeId;
      const layoutedNodes = calculateLayout(newNodes, newEdges, rootId);
      
      return {
        nodes: layoutedNodes,
        edges: newEdges,
      };
    });

    if (!isMapVisible) {
      setIsMapVisible(true);
    }
  }, [isMapVisible, setData]);

  const handleNodePress = useCallback((id: string) => {
    setActiveNodeId(id);
  }, []);

  const activeNode = data.nodes.find(n => n.id === activeNodeId) || null;

  //選択したノードから親ノード（parentId）を順に辿ってルート（一番上の親）までの経路リスト（パス）を作る処理
  const activeNodePath = useMemo(() => {
    if (!activeNodeId) return [];
    const path: MindMapNode[] = [];
    let currentId: string | null | undefined = activeNodeId;
    //  Set は、重複しない一意な値を管理するためのオブジェクト
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = data.nodes.find(n => n.id === currentId);
      if (node) {
        path.unshift(node);
        currentId = node.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [activeNodeId, data.nodes]);

  const handleUpdateNodeNote = useCallback((id: string, note: string, images?: string[]) => {
    setData(prevData => {
      const newNodes = prevData.nodes.map(node =>
        node.id === id ? { ...node, note, ...(images && { images }) } : node
      );
      
      const node = prevData.nodes.find(n => n.id === id);
      if (node && pageId) {
        addActivityLog({
          type: 'note',
          pageId,
          nodeId: id,
          nodeLabel: node.label,
          snippet: note ? note.substring(0, 50) : 'ノートを削除しました'
        });
      }

      return {
        ...prevData,
        nodes: newNodes,
      };
    });
  }, [setData, pageId]);

  const handleRenameNode = useCallback((id: string, newLabel: string) => {
    if (!newLabel.trim()) return;
    setData(prevData => {
      const newNodes = prevData.nodes.map(node =>
        node.id === id ? { ...node, label: newLabel.trim() } : node
      );
      
      const rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0]?.id;
      const layoutedNodes = rootId ? calculateLayout(newNodes, prevData.edges, rootId) : newNodes;

      return {
        ...prevData,
        nodes: layoutedNodes,
      };
    });
  }, [setData]);

  // 「折りたたみ（開閉）状態」を切り替えて、それに応じてマップ全体のレイアウトを再計算
  const handleToggleCollapse = useCallback((id: string, isCollapsed: boolean) => {
    setData(prevData => {
      const newNodes = prevData.nodes.map(n => 
        n.id === id ? { ...n, isCollapsed } : n
      );
      //レイアウト再構成のためにルートノードを特定、今回は親idを持たないノードを探している。
      const rootId = newNodes.find(n => !n.parentId)?.id || newNodes[0]?.id;
      const layoutedNodes = rootId ? calculateLayout(newNodes, prevData.edges, rootId) : newNodes;
      return {
        ...prevData,
        nodes: layoutedNodes,
      };
    });
  }, [setData]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodeIdToDelete(id);
  }, []);

  const confirmDeleteNode = useCallback(() => {
    if (nodeIdToDelete) {
      setData(prevData => deleteNodeAndChildren(prevData, nodeIdToDelete));
      if (activeNodeId === nodeIdToDelete) {
        setActiveNodeId(null);
      }
      setNodeIdToDelete(null);
    }
  }, [nodeIdToDelete, activeNodeId, setData]);

  const cancelDeleteNode = useCallback(() => {
    setNodeIdToDelete(null);
  }, []);

  return {
    data,
    isMapVisible,
    activeNodeId,
    activeNode,
    activeNodePath,
    handleSendMessage,
    handleSendNoteChat,
    handleAddManualNode,
    handleUpdateNodeNote,
    handleRenameNode,
    handleToggleCollapse,
    handleDeleteNode,
    confirmDeleteNode,
    cancelDeleteNode,
    nodeIdToDelete,
    handleNodePress,
    setActiveNodeId,
    isGenerating,
    isNoteChatLoading,
    generationError,
    paywallReason,
    setPaywallReason,
  };
};
