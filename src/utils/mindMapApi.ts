import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import { MindMapNode, MindMapEdge, MindMapData } from '../types';
import { calculateLayout } from './layout';

// 動的にホストIPを取得してWorkerのURLを設定
export const getWorkerUrl = () => {
  // 開発中（Expo Go）でも強制的に本番環境のWorkerに繋ぎたい場合は以下のコメントアウトを外してください
  return 'https://mindmap-api-prod.gizaguri0426.workers.dev';

  // if (__DEV__) {
  //   let hostIp: string | null = null;

  //   // 1. まずバンドルURLから取得を試みる
  //   const scriptURL = NativeModules.SourceCode?.scriptURL;
  //   if (scriptURL) {
  //     const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
  //     if (match && match[1]) hostIp = match[1];
  //   }

  //   // 2. 取得できない場合は Expo の設定から取得する
  //   if (!hostIp) {
  //     const hostUri = Constants.expoConfig?.hostUri;
  //     if (hostUri) {
  //       hostIp = hostUri.split(':')[0];
  //     }
  //   }

  //   if (hostIp) {
  //     // Androidエミュレータの場合のlocalhost変換
  //     if (Platform.OS === 'android' && (hostIp === 'localhost' || hostIp === '127.0.0.1')) {
  //       hostIp = '10.0.2.2';
  //     }
  //     return `http://${hostIp}:8787`;
  //   }
  // }
  // 全ての取得に失敗した時、または本番環境(__DEV__ === false)の時のURL
  return 'https://mindmap-api-prod.gizaguri0426.workers.dev';
};

interface SendMessageParams {
  message: string;
  parentId: string | null;
  aiMode: 'flash' | 'pro';
  nodes: MindMapNode[];
  token: string | null;
  onPaywall: () => void;
}

export const sendMindMapMessage = async ({
  message,
  parentId,
  aiMode,
  nodes,
  token,
  onPaywall,
}: SendMessageParams) => {
  const model = aiMode === 'pro' ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
  let parentContext = '';
  
  //ノードの階層
  if (parentId) {
    const contextNodes = [];
    let currentId: string | null | undefined = parentId;
    while (currentId) {
      const node = nodes.find(n => n.id === currentId);
      if (node) {
        contextNodes.unshift(node.label);
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
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ message, parentId, parentContext, model }),
  });

  if (!response.ok) {
    if (response.status === 402) {
      onPaywall();
      throw new Error('Insufficient credits');
    }
    const errorText = await response.text();
    console.error('Fetch error details:', errorText);
    throw new Error(`Failed to fetch from backend API: ${errorText}`);
  }
  
// {  response.json() で返される型式
//   "chatResponse": "北海道に関連する主な都市として、札幌と函館を提案します。どうでしょうか？",
//   "mindMapUpdates": {
//     "nodes": [
//       { "id": "node_sapporo_123", "label": "札幌", "parentId": "node_hokkaido_001" },
//       { "id": "node_hakodate_456", "label": "函館", "parentId": "node_hokkaido_001" }
//     ],
//     "edges": [
//       { "source": "node_hokkaido_001", "target": "node_sapporo_123" },
//       { "source": "node_hokkaido_001", "target": "node_hakodate_456" }
//     ]
//   }
// }

  return response.json();
};

interface ProcessUpdatesParams {
  prevData: MindMapData;
  resultUpdates: { nodes: MindMapNode[]; edges: MindMapEdge[] };
  parentId: string | null;
  message: string;
}

export const processMindMapUpdates = ({
  prevData,
  resultUpdates,
  parentId,
  message,
}: ProcessUpdatesParams): MindMapData => {
  let injectedNodes = [...resultUpdates.nodes];
  let injectedEdges = [...resultUpdates.edges];

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

  const rootId = !parentId ? resultUpdates.nodes[0].id : prevData.nodes[0]?.id;
  const layoutedNodes = calculateLayout(newNodes, newEdges, rootId);

  return {
    nodes: layoutedNodes,
    edges: newEdges,
  };
};
