import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MindMapNode } from '../types';
import { renderTextWithLinks } from '../utils/textUtils';

interface AIChatTabProps {
  node: MindMapNode;
  onSendChat?: (message: string, nodeId: string) => void;
  isChatLoading?: boolean;
}

export const AIChatTab: React.FC<AIChatTabProps> = ({ node, onSendChat, isChatLoading }) => {
  const [chatMessage, setChatMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <View style={styles.chatContainer}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatHistory}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {node.chatHistory?.map((msg, index) => (
          <View key={index} style={[styles.chatBubble, msg.role === 'ai' ? styles.chatBubbleAi : styles.chatBubbleUser]}>
            <Text selectable={true} style={styles.chatBubbleText}>
              {renderTextWithLinks(msg.text)}
            </Text>
          </View>
        ))}
        {isChatLoading && (
          <View style={[styles.chatBubble, styles.chatBubbleAi, { flexDirection: 'row', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={[styles.chatBubbleText, { color: '#94a3b8' }]}>思考中...</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          value={chatMessage}
          onChangeText={setChatMessage}
          placeholder="AIにメッセージを送信..."
          placeholderTextColor="#94a3b8"
          multiline
          textAlignVertical="center"
        />
        <TouchableOpacity 
          style={[styles.sendChatButton, (!chatMessage.trim() || isChatLoading) && styles.sendChatButtonDisabled]}
          onPress={() => {
            if (chatMessage.trim() && onSendChat) {
              onSendChat(chatMessage, node.id);
              setChatMessage('');
            }
          }}
          disabled={!chatMessage.trim() || isChatLoading}
        >
          <Text style={styles.sendChatButtonText}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chatContainer: {
    flexShrink: 1,
    height: 400,
    flexDirection: 'column',
  },
  chatHistory: {
    flex: 1,
    padding: 16,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  chatBubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 10,
    color: '#f8fafc',
    minHeight: 40,
    maxHeight: 120,
  },
  sendChatButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendChatButtonDisabled: {
    opacity: 0.5,
  },
  sendChatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
