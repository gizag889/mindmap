import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { MindMapNode } from '../types';
import { NoteTab } from './NoteTab';
import { AIChatTab } from './AIChatTab';
import { useMindMapStore } from '../store/useMindMapStore';

interface NoteModalProps {
  onSendChat?: (message: string, nodeId: string) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ onSendChat }) => {
  const [activeTab, setActiveTab] = useState<'note' | 'chat'>('note');

  const visible = useMindMapStore(state => state.isNoteModalVisible);
  const setIsNoteModalVisible = useMindMapStore(state => state.setIsNoteModalVisible);
  const isMapVisible = useMindMapStore(state => state.isMapVisible);
  const data = useMindMapStore(state => state.data);
  const activeNodeId = useMindMapStore(state => state.activeNodeId);
  const onSave = useMindMapStore(state => state.handleUpdateNodeNote);
  const isChatLoading = useMindMapStore(state => state.isNoteChatLoading);
  
  const onClose = () => setIsNoteModalVisible(false);

  const node = React.useMemo(() => isMapVisible ? (data.nodes.find(n => n.id === activeNodeId) || null) : null, [data.nodes, activeNodeId, isMapVisible]);

  const activeNodePath = React.useMemo(() => {
    if (!isMapVisible || !activeNodeId) return [];
    const path: MindMapNode[] = [];
    let currentId: string | null | undefined = activeNodeId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const n = data.nodes.find(x => x.id === currentId);
      if (n) {
        path.unshift(n);
        currentId = n.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [activeNodeId, data.nodes, isMapVisible]);

  if (!node) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior="padding"
        >
          <View style={[styles.modalContainer, { zIndex: 1 }]}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title} numberOfLines={1}>
                  📝 {node.label} のノート
                </Text>
                {activeNodePath.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.breadcrumbContainer}
                  >
                    {activeNodePath.map((pathNode, index) => {
                      const isLast = index === activeNodePath.length - 1;
                      return (
                        <View key={pathNode.id} style={styles.breadcrumbItemWrapper}>
                          <Text style={[
                            styles.breadcrumbText,
                            isLast && styles.breadcrumbActiveText
                          ]} numberOfLines={1}>
                            {pathNode.label}
                          </Text>
                          {!isLast && (
                            <Text style={styles.breadcrumbSeparator}>&gt;</Text>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'note' && styles.activeTab]}
                onPress={() => setActiveTab('note')}
              >
                <Text style={[styles.tabText, activeTab === 'note' && styles.activeTabText]}>ノート</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
                onPress={() => setActiveTab('chat')}
              >
                <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>AIと壁打ち</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'note' ? (
              <NoteTab 
                node={node}
                visible={visible}
                onSave={onSave}
                onClose={onClose}
              />
            ) : (
              <AIChatTab 
                node={node}
                onSendChat={onSendChat}
                isChatLoading={isChatLoading}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  breadcrumbActiveText: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  breadcrumbSeparator: {
    color: '#475569',
    fontSize: 10,
    marginHorizontal: 4,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#60a5fa',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#60a5fa',
  },
});
