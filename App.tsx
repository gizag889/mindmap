import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MindMap } from './src/components/MindMap';
import { ChatSheet } from './src/components/ChatSheet';
import { NoteModal } from './src/components/NoteModal';
import { Sidebar } from './src/components/Sidebar';
import { useMindMap } from './src/hooks/useMindMap';
import { useMindMapPages } from './src/hooks/useMindMapPages';
import { useSettings } from './src/hooks/useSettings';

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
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const {
    pages,
    activePageId,
    setActivePageId,
    createNewPage,
    updatePage,
    deletePage,
    isLoaded: isPagesLoaded
  } = useMindMapPages();

  const { settings, updateSettings, isLoaded: isSettingsLoaded } = useSettings();

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
  } = useMindMap(activePageId, updatePage, settings.aiMode);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsSidebarVisible(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activePageId ? pages.find(p => p.id === activePageId)?.title || '無題' : 'MindMap'}
        </Text>
      </SafeAreaView>

      <View style={styles.content}>
        {isMapVisible && activePageId ? (
          <Animated.View style={styles.mapContainer} entering={FadeIn.duration(1000)} exiting={FadeOut}>
            <MindMap
              nodes={data.nodes}
              edges={data.edges}
              activeNodeId={activeNodeId}
              onNodePress={handleNodePress}
            />
          </Animated.View>
        ) : (
          <View style={styles.initialScreen}>
            {isPagesLoaded && !activePageId && (
              <>
                <Text style={styles.emptyText}>ページが選択されていません</Text>
                <TouchableOpacity style={styles.createButton} onPress={() => {
                  createNewPage();
                }}>
                  <Text style={styles.createButtonText}>新しいマップを作成する</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
      {!!activePageId && (
        <ChatSheet
          activeNode={isMapVisible ? activeNode : null}
          activeNodePath={isMapVisible ? activeNodePath : []}
          onSendMessage={handleSendMessage}
          onAddManualNode={handleAddManualNode}
          onEditNote={() => setIsNoteModalVisible(true)}
          onClose={() => setActiveNodeId(null)}
          onNodePress={handleNodePress}
        />
      )}
      {isMapVisible && activePageId && (
        <NoteModal
          visible={isNoteModalVisible}
          node={activeNode}
          activeNodePath={isMapVisible ? activeNodePath : []}
          onSave={handleUpdateNodeNote}
          onClose={() => setIsNoteModalVisible(false)}
          onSendChat={handleSendNoteChat}
          isChatLoading={isNoteChatLoading}
        />
      )}
      {isSidebarVisible && (
        <Sidebar
          pages={pages}
          activePageId={activePageId}
          aiMode={settings.aiMode}
          onModeChange={(mode) => updateSettings({ aiMode: mode })}
          onSelectPage={(id) => {
            setActivePageId(id);
            setIsSidebarVisible(false);
          }}
          onCreatePage={() => {
            createNewPage();
            setIsSidebarVisible(false);
          }}
          onDeletePage={deletePage}
          onClose={() => setIsSidebarVisible(false)}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    zIndex: 10,
  },
  menuButton: {
    padding: 8,
    marginRight: 16,
  },
  menuIcon: {
    color: '#f8fafc',
    fontSize: 24,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
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
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
