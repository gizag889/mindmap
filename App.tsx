import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MindMap } from './src/components/MindMap';
import { ChatSheet } from './src/components/ChatSheet';
import { NoteModal } from './src/components/NoteModal';
import { useMindMap } from './src/hooks/useMindMap';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

function MainApp() {
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const {
    data,
    isMapVisible,
    activeNodeId,
    activeNode,
    activeNodePath,
    handleSendMessage,
    handleSendNoteChat,
    handleAddManualNode,
    handleUpdateNodeNote,
    handleNodePress,
    setActiveNodeId,
    isNoteChatLoading,
  } = useMindMap();

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
        activeNodePath={isMapVisible ? activeNodePath : []}
        onSendMessage={handleSendMessage}
        onAddManualNode={handleAddManualNode}
        onEditNote={() => setIsNoteModalVisible(true)}
        onClose={() => setActiveNodeId(null)}
        onNodePress={handleNodePress}
      />
      <NoteModal
        visible={isNoteModalVisible}
        node={activeNode}
        activeNodePath={isMapVisible ? activeNodePath : []}
        onSave={handleUpdateNodeNote}
        onClose={() => setIsNoteModalVisible(false)}
        onSendChat={handleSendNoteChat}
        isChatLoading={isNoteChatLoading}
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
