import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MindMap } from './src/components/MindMap';
import { ChatSheet } from './src/components/ChatSheet';
import { MindMapData, MindMapNode } from './src/types';
import { calculateLayout } from './src/utils/layout';

const WORKER_URL = 'http://192.168.0.20:8787'; // For device testing use your local IP e.g. http://192.168.1.x:8787

export default function App() {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [data, setData] = useState<MindMapData>({ nodes: [], edges: [] });

  const handleSendMessage = async (message: string, parentId: string | null) => {
    try {
      // Simulate API call to the Worker
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, parentId }),
      });

      if (!response.ok) {
        console.error('Failed to fetch from dummy API');
        return;
      }

      const result = await response.json();
      
      // Update state with new nodes and edges
      setData(prevData => {
        const newNodes = [...prevData.nodes, ...result.mindMapUpdates.nodes];
        const newEdges = [...prevData.edges, ...result.mindMapUpdates.edges];
        
        // Find the root if it's the first message
        const rootId = !parentId ? result.mindMapUpdates.nodes[0].id : prevData.nodes[0]?.id;
        
        // Recalculate layout
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
      // For now, if it's new, we focus the parent node to see the new children expand
      if (parentId) {
        setActiveNodeId(parentId);
      } else {
        setActiveNodeId(result.mindMapUpdates.nodes[0].id);
      }

    } catch (error) {
      console.error('Error fetching dummy API:', error);
    }
  };

  const handleNodePress = (id: string) => {
    setActiveNodeId(id);
  };

  const activeNode = data.nodes.find(n => n.id === activeNodeId) || null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
        {isMapVisible ? (
          <Animated.View style={styles.mapContainer} entering={FadeIn.duration(1000)} exiting={FadeOut}>
            <MindMap
              nodes={data.nodes}
              edges={data.edges}
              activeNodeId={activeNodeId}
              onNodePress={handleNodePress}
            />
          </Animated.View>
        ) : (
          <View style={styles.initialScreen} />
        )}
      </View>
      <ChatSheet
        activeNode={isMapVisible ? activeNode : null}
        onSendMessage={handleSendMessage}
        onClose={() => setActiveNodeId(null)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark theme background
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  initialScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
