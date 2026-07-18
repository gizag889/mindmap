import { useEffect, useMemo } from 'react';
import { MindMapNode, MindMapPage } from '../types';
import { useMindMapStorage } from './useMindMapStorage';
import { useMindMapAI } from './useMindMapAI';
import { useMindMapStore } from '../store/useMindMapStore';

export const useMindMap = (
  pageId: string | null,
  token: string | null,
  onUpdatePage?: (id: string, updates: Partial<MindMapPage>) => void,
  aiMode: 'flash' | 'pro' = 'flash'
) => {
  // 1. AsyncStorage によるデータロード・セーブを管理
  useMindMapStorage(pageId, onUpdatePage);

  // 2. AI API 通信およびチャット処理を管理
  const {
    handleSendMessage,
    handleSendNoteChat,
  } = useMindMapAI({
    pageId,
    token,
    aiMode,
  });

  const isLoaded = useMindMapStore((state) => state.isLoaded);
  const data = useMindMapStore((state) => state.data);
  const setIsMapVisible = useMindMapStore((state) => state.setIsMapVisible);
  const setActiveNodeId = useMindMapStore((state) => state.setActiveNodeId);
  const activeNodeId = useMindMapStore((state) => state.activeNodeId);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, isLoaded]); // We intentionally do not include data.nodes here to avoid resetting visibility on every node change

  const activeNode = useMemo(() => data.nodes.find(n => n.id === activeNodeId) || null, [data.nodes, activeNodeId]);

  //選択したノードから親ノード（parentId）を順に辿ってルート（一番上の親）までの経路リスト（パス）を作る処理
  const activeNodePath = useMemo(() => {
    if (!activeNodeId) return [];
    const path: MindMapNode[] = [];
    let currentId: string | null | undefined = activeNodeId;
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

  return {
    activeNode,
    activeNodePath,
    handleSendMessage,
    handleSendNoteChat,
  };
};
