import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MindMapData } from '../types';
import { sendMindMapMessage, processMindMapUpdates, getWorkerUrl } from '../utils/mindMapApi';

interface UseMindMapAIProps {
  data: MindMapData;
  setData: React.Dispatch<React.SetStateAction<MindMapData>>;
  isMapVisible: boolean;
  setIsMapVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  token: string | null;
  aiMode: 'flash' | 'pro';
}

export const useMindMapAI = ({
  data,
  setData,
  isMapVisible,
  setIsMapVisible,
  setActiveNodeId,
  token,
  aiMode,
}: UseMindMapAIProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<Error | null>(null);
  const [isNoteChatLoading, setIsNoteChatLoading] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'insufficient_credits' | 'add_credits' | null>(null);
  const queryClient = useQueryClient();

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
        onPaywall: () => setPaywallReason('insufficient_credits'),
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
      
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error) {
      console.error('Error fetching dummy API:', error);
      setGenerationError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [aiMode, data.nodes, isMapVisible, token, setData, setIsMapVisible, setActiveNodeId]);

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
          setPaywallReason('insufficient_credits');
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
      
      queryClient.invalidateQueries({ queryKey: ['user'] });
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
  }, [data.nodes, aiMode, token, setData]);

  return {
    isGenerating,
    generationError,
    isNoteChatLoading,
    paywallReason,
    setPaywallReason,
    handleSendMessage,
    handleSendNoteChat,
  };
};
