import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MindMap } from './src/components/MindMap';
import { ChatSheet } from './src/components/ChatSheet';
import { NoteModal } from './src/components/NoteModal';
import { Sidebar } from './src/components/Sidebar';
import { useMindMap } from './src/hooks/useMindMap';
import { useMindMapPages } from './src/hooks/useMindMapPages';
import { useSettings } from './src/hooks/useSettings';
import { ConfirmModal } from './src/components/ConfirmModal';
import { PivotModal } from './src/components/PivotModal';
import { PaywallModal } from './src/components/PaywallModal';
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
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [pivotModalNodeId, setPivotModalNodeId] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

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

  //ここでmindmapから取得
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
    handleToggleCollapse,
    handleNodePress,
    handleDeleteNode,
    confirmDeleteNode,
    cancelDeleteNode,
    nodeIdToDelete,
    setActiveNodeId,
    isNoteChatLoading,
    paywallReason,
    setPaywallReason,
  } = useMindMap(activePageId, session?.access_token || null, updatePage, settings.aiMode);

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
          activeNode={isMapVisible ? activeNode : null}
          activeNodePath={isMapVisible ? activeNodePath : []}
          hasNodes={data.nodes && data.nodes.length > 0}
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
      {isMapVisible && activePageId && (
        <ConfirmModal
          visible={nodeIdToDelete !== null}
          title="ノードの削除"
          message="本当に削除しますか？"
          warningMessage="※削除されるノード以下の子ノードすべて削除されます。"
          onConfirm={confirmDeleteNode}
          onCancel={cancelDeleteNode}
        />
      )}
      {isMapVisible && activePageId && (
        <PivotModal
          visible={pivotModalNodeId !== null}
          node={data.nodes.find(n => n.id === pivotModalNodeId) || null}
          onToggleCollapse={handleToggleCollapse}
          onClose={() => setPivotModalNodeId(null)}
        />
      )}
      {isSidebarVisible && (
        <Sidebar
          pages={pages}
          activePageId={activePageId}
          aiMode={settings.aiMode}
          token={session?.access_token || null}
          onModeChange={(mode) => updateSettings({ aiMode: mode })}
          onSelectPage={(id, nodeId) => {
            if (id === activePageId) {
              if (nodeId) setActiveNodeId(nodeId);
            } else {
              setActivePageId(id);
              if (nodeId) setPendingNodeId(nodeId);
            }
            setIsSidebarVisible(false);
          }}
          onCreatePage={() => {
            createNewPage();
            setIsSidebarVisible(false);
          }}
          onDeletePage={deletePage}
          onOpenPaywall={() => {
            setPaywallReason('add_credits');
            setIsSidebarVisible(false);
          }}
          onClose={() => setIsSidebarVisible(false)}
        />
      )}
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
