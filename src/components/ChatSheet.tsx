import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { MindMapNode } from '../types';

interface ChatSheetProps {
  activeNode: MindMapNode | null;
  onSendMessage: (message: string, parentId: string | null) => Promise<void>;
  onAddManualNode: (label: string, parentId: string | null) => void;
  onClose: () => void;
}

export const ChatSheet: React.FC<ChatSheetProps> = ({ activeNode, onSendMessage, onAddManualNode, onClose }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsLoading(true);
    await onSendMessage(message, activeNode?.id || null);
    setMessage('');
    setIsLoading(false);
  };

  const handleManualAdd = () => {
    if (!message.trim()) return;
    onAddManualNode(message, activeNode?.id || null);
    setMessage('');
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {activeNode && (
          <View style={styles.header}>
            <Text style={styles.headerText}>Focused: {activeNode.label}</Text>
          </View>
        )}
        <View style={styles.chatArea}>
          <Text style={styles.chatPrompt}>
            {activeNode ? 'このアイデアについて深掘りしましょう。' : '整理したいテーマを教えてください。'}
          </Text>
        </View>
        <View style={styles.inputContainer}>
          <BottomSheetTextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="メッセージ または ノード名..."
            placeholderTextColor="#94a3b8"
            editable={!isLoading}
          />
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.manualButton, isLoading && styles.disabledButton]} 
              onPress={handleManualAdd}
              disabled={isLoading || !message.trim()}
            >
              <Text style={styles.manualButtonText}>＋ 手動追加</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sendButton, isLoading && styles.disabledButton]} 
              onPress={handleSend}
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>AI生成</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: {
    backgroundColor: '#cbd5e1',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatPrompt: {
    color: '#f8fafc',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginTop: 'auto',
  },
  input: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  manualButton: {
    backgroundColor: '#475569',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
