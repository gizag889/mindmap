import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { MindMapData, MindMapNode, MindMapPage, MindMapEdge } from '../types';
import { calculateLayout } from '../utils/layout';
import { deleteNodeAndChildren } from '../utils/nodeOperations';

// 動的にホストIPを取得してWorkerのURLを設定
import { sendMindMapMessage, processMindMapUpdates, getWorkerUrl } from '../utils/mindMapApi';

const MINDMAP_STORAGE_KEY = '@mindmap_data';

interface SendMessageParams {
  message: string;
  parentId: string | null;
  parentContext?: string;
  model: string;
}

export const useMindMap = (
  pageId: string | null,
  token: string | null,
  onUpdatePage?: (id: string, updates: Partial<MindMapPage>) => void,
  aiMode: 'flash' | 'pro' = 'flash'
) => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [data, setData] = useState<MindMapData>({ nodes: [], edges: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isNoteChatLoading, setIsNoteChatLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<Error | null>(null);
  const [nodeIdToDelete, setNodeIdToDelete] = useState<string | null>(null);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);

  useEffect(() => {
    if (!pageId) {
      setData({ nodes: [], edges: [] });
      setIsMapVisible(false);
      setActiveNodeId(null);
      setIsLoaded(true);
      return;
    }

    const loadData = async () => {
      setIsLoaded(false);
      try {
        //  AsyncStorage からマップデータを取得（ロード）しています
        const jsonValue = await AsyncStorage.getItem(`@mindmap_data_${pageId}`);
        if (jsonValue != null) {
          const parsedData = JSON.parse(jsonValue);
          setData(parsedData);
          if (parsedData.nodes && parsedData.nodes.length > 0) {
            setIsMapVisible(true);
          } else {
            setIsMapVisible(false);
          }
        } else {
          setData({ nodes: [], edges: [] });
          setIsMapVisible(false);
        }
      } catch (e) {
        console.error('Error loading mindmap data from AsyncStorage:', e);
      } finally {
        setIsLoaded(true);
        setActiveNodeId(null);
      }
    };
    loadData();
  }, [pageId]);


  //最新のデータを AsyncStorage に書き込む（保存する）。
  useEffect(() => {
    if (!isLoaded || !pageId) return;
    const saveData = async () => {
      try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(`@mindmap_data_${pageId}`, jsonValue);
        
        if (data.nodes.length > 0 && onUpdatePage) {
          const rootNode = data.nodes.find(n => !n.parentId) || data.nodes[0];
          onUpdatePage(pageId, { title: rootNode.label, updatedAt: Date.now() });
        }
      } catch (e) {
        console.error('Error saving mindmap data to AsyncStorage:', e);
      }
    };
    saveData();
  }, [data, isLoaded, pageId]);

  const handleSendMessage = useCallback(async (message: string, parentId: string | null) => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await sendMindMapMessage({
        message,
        parentId,
        aiMode,
        nodes: data.nodes,
        token,
        onPaywall: () => setIsPaywallVisible(true),
      });

      setData(prevData =>
        processMindMapUpdates({
          prevData,
          resultUpdates: result.mindMapUpdates,
          parentId,
          message,
        })
      );

      if (!isMapVisible) {
        setIsMapVisible(true);
      }
      
      // Focus the node that was just added or keep the parent focused
      if (parentId) {
        setActiveNodeId(parentId);
      } else {
        setActiveNodeId(result.mindMapUpdates.nodes[0].id);
      }
    } catch (error) {
      console.error('Error fetching dummy API:', error);
      setGenerationError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [aiMode, data.nodes, isMapVisible, token]);

  const handleSendNoteChat = useCallback(async (message: string, nodeId: string) => {
    const node = data.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const contextNodes = [];
    let currentId: string | null | undefined = nodeId;
    while (currentId) {
      const n = data.nodes.find(x => x.id === currentId);
      if (n) {
        contextNodes.unshift(n.label);
        currentId = n.parentId;
      } else {
        break;
      }
    }
    const parentContext = contextNodes.join(" > ");
    const noteContent = node.note || '';
    const currentHistory = node.chatHistory || [];

    // Optimistic Update
    setData(prevData => {
      //既存のノード一覧から、チャットを送信した対象のノード（nodeId）を特定します
      const newNodes = prevData.nodes.map(n => 
        //...n 対象：ノード（オブジェクト全体）
        //配列のコピー 過去のチャット履歴: ...(n.chatHistory || [])
        // 新しいチャットメッセージ： { role: 'user' as const, text: message } これを上記配列の末尾に追加
        n.id === nodeId ? { ...n, chatHistory: [...(n.chatHistory || []), { role: 'user' as const, text: message }] } : n
      );
      return { ...prevData, nodes: newNodes };
    });

    setIsNoteChatLoading(true);
    try {
      const model = aiMode === 'pro' ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
      const url = getWorkerUrl();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message,
          parentId: nodeId,
          parentContext,
          chatMode: true,
          noteContent,
          chatHistory: currentHistory,
          model
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          setIsPaywallVisible(true);
          throw new Error('Insufficient credits');
        }
        throw new Error('Failed to fetch chat response');
      }

      const result = await response.json();
      const chatResponse = result.chatResponse;

      // Add AI response
      setData(prevData => {
        const newNodes = prevData.nodes.map(n => 
          n.id === nodeId ? { ...n, chatHistory: [...(n.chatHistory || []), { role: 'ai' as const, text: chatResponse }] } : n
        );
        return { ...prevData, nodes: newNodes };
      });
    } catch (error) {
      console.error('Error fetching note chat:', error);
      // Revert optimistic update
      setData(prevData => {
        const newNodes = prevData.nodes.map(n => 
          n.id === nodeId ? { ...n, chatHistory: currentHistory } : n
        );
        return { ...prevData, nodes: newNodes };
      });
    } finally {
      setIsNoteChatLoading(false);
    }
  }, [data.nodes, aiMode, token]);

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
  }, [isMapVisible]);

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
        //...node: 元のノードオブジェクトが持っているすべてのプロパティ（id や label、chatHistory など）を新しいオブジェクトに丸ごとコピーします。
        // note: 新しいノートの内容（note 引数）で、元のノート情報を上書きします。

        //images（画像データの配列）が存在する場合：
        //images && { images } は、{ images: images } と評価されます。
        //これをスプレッド構文 ... で展開するため、結果としてオブジェクトの中に images: images が追加（または上書き）されます。
        //images が存在しない（undefined や null などの）場合：
        //images && ... が undefined（または false）と評価されます。
        //スプレッド構文は undefined や false を展開しようとしても何も追加しないため、ノードオブジェクトには影響を与えません（エラーも起きません）。
        node.id === id ? { ...node, note, ...(images && { images }) } : node
      );
      return {
        ...prevData,
        nodes: newNodes,
      };
    });
  }, []);

  // 「折りたたみ（開閉）状態」を切り替えて、それに応じてマップ全体のレイアウトを再計算
  const handleToggleCollapse = useCallback((id: string, isCollapsed: boolean) => {
    setData(prevData => {
      const newNodes = prevData.nodes.map(n => 
        //iscollapsedを更新して、ノードが閉じているか開いているかを更新します。
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
  }, []);

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
  }, [nodeIdToDelete, activeNodeId]);

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
    isPaywallVisible,
    setIsPaywallVisible,
  };
};
