import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Alert } from 'react-native';
import { MindMapNode } from '../types';

interface ChatSheetProps {
  activeNode: MindMapNode | null;
  activeNodePath?: MindMapNode[];
  onSendMessage: (message: string, parentId: string | null) => Promise<void>;
  onAddManualNode: (label: string, parentId: string | null) => void;
  onRenameNode?: (id: string, newLabel: string) => void;
  onEditNote?: () => void;
  onClose: () => void;
  onNodePress?: (id: string) => void;
  hasNodes?: boolean;
}

export const ChatSheet: React.FC<ChatSheetProps> = ({
  activeNode,
  activeNodePath = [],
  onSendMessage,
  onAddManualNode,
  onRenameNode,
  onEditNote,
  onClose,
  onNodePress,
  hasNodes = false,
}) => {
  const draftsRef = React.useRef<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState('');

  const currentNodeId = activeNode?.id || 'root';

  // ノード選択切り替え時に、下書きメッセージをロードする
  React.useEffect(() => {
    setMessage(draftsRef.current[currentNodeId] || '');
    setIsRenaming(false);
  }, [currentNodeId]);

  const handleMessageChange = (text: string) => {
    setMessage(text);
    draftsRef.current[currentNodeId] = text;
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    if (hasNodes && !activeNode) {
      Alert.alert('エラー', 'ノードが選択されていません');
      return;
    }
    setIsLoading(true);
    await onSendMessage(message, activeNode?.id || null);
    setMessage('');
    draftsRef.current[currentNodeId] = '';
    setIsLoading(false);
  };

  const handleManualAdd = () => {
    if (!message.trim()) return;
    if (hasNodes && !activeNode) {
      Alert.alert('エラー', 'ノードが選択されていません');
      return;
    }
    onAddManualNode(message, activeNode?.id || null);
    setMessage('');
    draftsRef.current[currentNodeId] = '';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      pointerEvents="box-none"
    >
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        <View style={styles.floatingContainer}>
          {activeNode && (
            <View style={styles.activeNodeIndicator}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.breadcrumbContainer}
                style={{ flex: 1 }}
              >
                {activeNodePath.map((node, index) => {
                  const isLast = index === activeNodePath.length - 1;
                  return (
                    <View key={node.id} style={styles.breadcrumbItemWrapper}>
                      {isLast && isRenaming ? (
                        <TextInput
                          value={renameText}
                          onChangeText={setRenameText}
                          autoFocus
                          style={[styles.breadcrumbText, styles.breadcrumbActiveText, styles.renameInput]}
                          onBlur={() => {
                            if (renameText.trim() && renameText !== node.label && onRenameNode) {
                              onRenameNode(node.id, renameText);
                            }
                            setIsRenaming(false);
                          }}
                          onSubmitEditing={() => {
                            if (renameText.trim() && renameText !== node.label && onRenameNode) {
                              onRenameNode(node.id, renameText);
                            }
                            setIsRenaming(false);
                          }}
                        />
                      ) : (
                        <TouchableOpacity
                          onPress={() => onNodePress && onNodePress(node.id)}
                          onLongPress={() => {
                            if (isLast && onRenameNode) {
                              setIsRenaming(true);
                              setRenameText(node.label);
                            }
                          }}
                          disabled={!onNodePress && !isLast}
                          style={styles.breadcrumbTouch}
                          activeOpacity={0.7}
                        >
                          <Text
                            selectable={true}
                            style={[
                              styles.breadcrumbText,
                              isLast && styles.breadcrumbActiveText
                            ]}
                            numberOfLines={1}
                          >
                            {node.label}
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {isLast && !isRenaming && onRenameNode && (
                        <TouchableOpacity 
                          onPress={() => {
                            setIsRenaming(true);
                            setRenameText(node.label);
                          }}
                          style={styles.renameIconButton}
                        >
                          <Text style={styles.renameIconText}>✏️</Text>
                        </TouchableOpacity>
                      )}

                      {!isLast && (
                        <Text style={styles.breadcrumbSeparator}>&gt;</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.searchBar}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={handleMessageChange}
              placeholder={!hasNodes ? "テーマを入力してマップ生成..." : (activeNode ? "ノードを追加・深掘り..." : "先にノードを選択してください")}
              placeholderTextColor="#94a3b8"
              editable={!isLoading}
              onSubmitEditing={handleSend}
            />
            
            {isLoading ? (
              <View style={styles.actionButton}>
                <ActivityIndicator color="#60a5fa" size="small" />
              </View>
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity 
                  style={[styles.actionButton, !activeNode && styles.disabledButton]} 
                  onPress={onEditNote}
                  disabled={!activeNode}
                >
                  <Text style={styles.actionButtonText}>📝</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, !message.trim() && styles.disabledButton]} 
                  onPress={handleManualAdd}
                  disabled={!message.trim()}
                >
                  <Text style={styles.actionButtonText}>＋</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryButton, !message.trim() && styles.disabledButton]} 
                  onPress={handleSend}
                  disabled={!message.trim()}
                >
                  <Text style={styles.primaryButtonText}>AI</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  floatingContainer: {
    marginHorizontal: 16,
    marginBottom: 24, // Androidのホーム画面の検索バーのようなマージン
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 8,
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Android Shadow
    elevation: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeNodeIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 8,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  breadcrumbItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbTouch: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  breadcrumbText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  breadcrumbActiveText: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  breadcrumbSeparator: {
    color: '#475569',
    fontSize: 12,
    marginHorizontal: 1,
  },
  renameInput: {
    minWidth: 60,
    padding: 0,
    margin: 0,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  renameIconButton: {
    marginLeft: 6,
    padding: 2,
  },
  renameIconText: {
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  actionButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
