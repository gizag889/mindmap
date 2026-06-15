import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MindMapData, MindMapNode } from '../types';
import { calculateLayout } from '../utils/layout';

const WORKER_URL = 'http://192.168.0.20:8787'; // For device testing use your local IP e.g. http://192.168.1.x:8787

interface SendMessageParams {
  message: string;
  parentId: string | null;
  parentContext?: string;
}

export const useMindMap = () => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [data, setData] = useState<MindMapData>({ nodes: [], edges: [] });

  const mutation = useMutation({
    mutationFn: async ({ message, parentId, parentContext }: SendMessageParams) => {
      const response = await fetch(WORKER_URL, {
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
