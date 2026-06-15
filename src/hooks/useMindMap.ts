import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { MindMapData, MindMapNode } from '../types';
import { calculateLayout } from '../utils/layout';

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
}

export const useMindMap = () => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [data, setData] = useState<MindMapData>({ nodes: [], edges: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  // 初回マウント時に AsyncStorage からデータを読み込む
  useEffect(() => {
    const loadData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(MINDMAP_STORAGE_KEY);
        if (jsonValue != null) {
          const parsedData = JSON.parse(jsonValue);
          setData(parsedData);
          if (parsedData.nodes && parsedData.nodes.length > 0) {
            setIsMapVisible(true);
          }
        }
      } catch (e) {
        console.error('Error loading mindmap data from AsyncStorage:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // data が更新されるたびに AsyncStorage に保存する
  useEffect(() => {
    if (!isLoaded) return; // 初回読み込み完了前は保存しない（空データでの上書き防止）
    const saveData = async () => {
      try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(MINDMAP_STORAGE_KEY, jsonValue);
      } catch (e) {
        console.error('Error saving mindmap data to AsyncStorage:', e);
      }
    };
    saveData();
  }, [data, isLoaded]);

  const mutation = useMutation({
    mutationFn: async ({ message, parentId, parentContext }: SendMessageParams) => {
      const url = getWorkerUrl();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, parentId, parentContext }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch from dummy API');
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      const { parentId } = variables;

      // Update state with new nodes and edges
      setData(prevData => {
        // 既存の nodes/edges と、Worker から受信した mindMapUpdates.nodes/edges をスプレッド構文で結合
        const newNodes = [...prevData.nodes, ...result.mindMapUpdates.nodes];
        const newEdges = [...prevData.edges, ...result.mindMapUpdates.edges];
        
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
    },
    onError: (error) => {
      console.error('Error fetching dummy API:', error);
    }
  });

  const handleSendMessage = useCallback(async (message: string, parentId: string | null) => {
    try {
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
      await mutation.mutateAsync({ message, parentId, parentContext });
    } catch (error) {
      // Error is already logged in onError, but we throw or swallow here to prevent unhandled promise rejection
      // The component (ChatSheet) also wraps the call in a try/catch or handles it.
    }
  }, [mutation, data.nodes]);

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

  return {
    data,
    isMapVisible,
    activeNodeId,
    activeNode,
    handleSendMessage,
    handleAddManualNode,
    handleNodePress,
    setActiveNodeId,
    isGenerating: mutation.isPending,
    generationError: mutation.error,
  };
};
