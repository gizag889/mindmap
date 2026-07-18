import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MindMap } from './src/components/MindMap';
import { ChatSheet } from './src/components/ChatSheet';
import { NoteModal } from './src/components/NoteModal';
import { Sidebar } from './src/components/Sidebar';
import { useMindMap } from './src/hooks/useMindMap';
import { useMindMapPagesStore } from './src/hooks/useMindMapPages';
import { useSettingsStore } from './src/hooks/useSettings';
import { ConfirmModal } from './src/components/ConfirmModal';
import { PivotModal } from './src/components/PivotModal';
import { PaywallModal } from './src/components/PaywallModal';
import { useMindMapStore } from './src/store/useMindMapStore';
import { useAuth } from './src/hooks/useAuth';
import { ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

function MainApp() {
  const { session, user, isLoading, linkGoogleAccount } = useAuth();
  const setIsSidebarVisible = useMindMapStore(state => state.setIsSidebarVisible);

  const {
    pages,
    activePageId,
    setActivePageId,
    createNewPage,
    updatePage,
    deletePage,
    isLoaded: isPagesLoaded,
    loadPages
  } = useMindMapPagesStore();

  const { settings, updateSettings, isLoaded: isSettingsLoaded, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadPages();
    loadSettings();
  }, [loadPages, loadSettings]);

  //ここでmindmapから取得
  const {
    activeNode,
    activeNodePath,
    handleSendMessage,
    handleSendNoteChat,
  } = useMindMap(activePageId, session?.access_token || null, updatePage, settings.aiMode);

  const data = useMindMapStore(state => state.data);
  const isMapVisible = useMindMapStore(state => state.isMapVisible);
  const activeNodeId = useMindMapStore(state => state.activeNodeId);
  const setActiveNodeId = useMindMapStore(state => state.setActiveNodeId);
  const pendingNodeId = useMindMapStore(state => state.pendingNodeId);
  const setPendingNodeId = useMindMapStore(state => state.setPendingNodeId);
  const setPivotModalNodeId = useMindMapStore(state => state.setPivotModalNodeId);
  const isNoteChatLoading = useMindMapStore(state => state.isNoteChatLoading);
  const paywallReason = useMindMapStore(state => state.paywallReason);
  const setPaywallReason = useMindMapStore(state => state.setPaywallReason);
  const setIsNoteModalVisible = useMindMapStore(state => state.setIsNoteModalVisible);
  
  const handleAddManualNode = useMindMapStore(state => state.handleAddManualNode);
  const handleUpdateNodeNote = useMindMapStore(state => state.handleUpdateNodeNote);
  const handleRenameNode = useMindMapStore(state => state.handleRenameNode);
  const handleToggleCollapse = useMindMapStore(state => state.handleToggleCollapse);
  const handleDeleteNode = useMindMapStore(state => state.setNodeIdToDelete);
  const handleNodePress = useMindMapStore(state => state.setActiveNodeId);

  useEffect(() => {
    if (isMapVisible && pendingNodeId && data.nodes?.some(n => n.id === pendingNodeId)) {
      setActiveNodeId(pendingNodeId);
      setPendingNodeId(null);
    }
  }, [isMapVisible, pendingNodeId, data.nodes, setActiveNodeId]);

  if (isLoading) {
    return (
      <View style={styles.initialScreen}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

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
              onNodePress={(id) => {
                const node = data.nodes.find(n => n.id === id);
                if (node?.type === 'ai_pivot') {
                  setPivotModalNodeId(id);
                } else {
                  handleNodePress(id);
                }
              }}
              onNodeLongPress={handleDeleteNode}
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
          onSendMessage={handleSendMessage}
          onEditNote={() => setIsNoteModalVisible(true)}
        />
      )}
      {isMapVisible && activePageId && (
        <NoteModal onSendChat={handleSendNoteChat} />
      )}
      {isMapVisible && activePageId && (
        <ConfirmModal />
      )}
      {isMapVisible && activePageId && (
        <PivotModal />
      )}
      <Sidebar />
      <PaywallModal 
        visible={paywallReason !== null} 
        reason={paywallReason || 'add_credits'}
        onClose={() => setPaywallReason(null)} 
      />
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
