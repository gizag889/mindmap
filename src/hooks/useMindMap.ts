import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { MindMapData, MindMapNode, MindMapPage, MindMapEdge } from '../types';
import { calculateLayout } from '../utils/layout';
import { deleteNodeAndChildren } from '../utils/nodeOperations';

// 動的にホストIPを取得してWorkerのURLを設定
const getWorkerUrl = () => {
  if (__DEV__) {
    let hostIp: string | null = null;

    // 1. まずバンドルURLから取得を試みる
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1]) hostIp = match[1];
    }

    // 2. 取得できない場合は Expo の設定から取得する
    if (!hostIp) {
      const hostUri = Constants.expoConfig?.hostUri;
      if (hostUri) {
        hostIp = hostUri.split(':')[0];
      }
    }

    if (hostIp) {
      // Androidエミュレータの場合のlocalhost変換
      if (Platform.OS === 'android' && (hostIp === 'localhost' || hostIp === '127.0.0.1')) {
        hostIp = '10.0.2.2';
      }
      return `http://${hostIp}:8787`;
    }
  }
  // 全ての取得に失敗した時の最終フォールバック
  return Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787';
};

const MINDMAP_STORAGE_KEY = '@mindmap_data';

interface SendMessageParams {
  message: string;
  parentId: string | null;
  parentContext?: string;
  model: string;
}

export const useMindMap = (
  pageId: string | null,
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
      const model = aiMode === 'pro' ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
      let parentContext = '';
      if (parentId) {
        const contextNodes = [];
        let currentId: string | null | undefined = parentId;
        while (currentId) {
          const node = data.nodes.find(n => n.id === currentId);
          if (node) {
            contextNodes.unshift(node.label);
            //インドマップのツリー構造を**「子ノードから親ノードへと上に向かって遡る（トラバースする）」**ためのポインタの更新処理
            currentId = node.parentId;
          } else {
            break;
          }
        }
        parentContext = contextNodes.join(" > ");
      }

      const url = getWorkerUrl();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, parentId, parentContext, model }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error details:', errorText);
        throw new Error(`Failed to fetch from dummy API: ${errorText}`);
      }

      const result = await response.json();

      // Update state with new nodes and edges
      setData(prevData => {
        let injectedNodes = [...result.mindMapUpdates.nodes];
        let injectedEdges = [...result.mindMapUpdates.edges];
        
        if (parentId) {
          const pivotId = `pivot-${Date.now()}`;
          const pivotNode: MindMapNode = {
            id: pivotId,
            label: "✨",
            parentId: parentId,
            type: 'ai_pivot',
            promptText: message,
            isCollapsed: false,
          };
          
          const pivotEdge: MindMapEdge = {
            source: parentId,
            target: pivotId,
          };
          
          injectedNodes = injectedNodes.map(n => {
            if (n.parentId === parentId) {
              return { ...n, parentId: pivotId };
            }
            return n;
          });
          
          injectedEdges = injectedEdges.map(e => {
            if (e.source === parentId && injectedNodes.some(n => n.id === e.target && n.parentId === pivotId)) {
               return { ...e, source: pivotId };
            }
            return e;
          });
          
          injectedNodes.push(pivotNode);
          injectedEdges.push(pivotEdge);
        }

        const newNodes = [...prevData.nodes, ...injectedNodes];
        const newEdges = [...prevData.edges, ...injectedEdges];
        
        // ルートノードの特定: 初回であれば新規生成されたノードの最初の要素、2回目以降であれば既存の最初のノードをルートノードとして特定します。
        const rootId = !parentId ? result.mindMapUpdates.nodes[0].id : prevData.nodes[0]?.id;
        
        // 座標の再計算: 結合したノードとエッジ、およびルートノードのIDを calculateLayout 関数に渡し、各ノードの配置用座標 (x, y) を計算・付与します。
        const layoutedNodes = calculateLayout(newNodes, newEdges, rootId);
        
        return {
          nodes: layoutedNodes,
          edges: newEdges,
        };
      });

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
  }, [aiMode, data.nodes, isMapVisible]);

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
      const newNodes = prevData.nodes.map(n => 
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
        headers: { 'Content-Type': 'application/json' },
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
  }, [data.nodes]);

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

  const handleUpdateNodeNote = useCallback((id: string, note: string, images?: string[]) => {
    setData(prevData => {
      const newNodes = prevData.nodes.map(node =>
        node.id === id ? { ...node, note, ...(images && { images }) } : node
      );
      return {
        ...prevData,
        nodes: newNodes,
      };
    });
  }, []);

  const handleToggleCollapse = useCallback((id: string, isCollapsed: boolean) => {
    setData(prevData => {
      const newNodes = prevData.nodes.map(n => 
        n.id === id ? { ...n, isCollapsed } : n
      );
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
  };
};
