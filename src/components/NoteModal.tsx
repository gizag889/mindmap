import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, SafeAreaView, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { MindMapNode } from '../types';

interface NoteModalProps {
  visible: boolean;
  node: MindMapNode | null;
  activeNodePath?: MindMapNode[];
  onSave: (nodeId: string, note: string) => void;
  onClose: () => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ visible, node, activeNodePath = [], onSave, onClose }) => {
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (visible && node) {
      setNoteText(node.note || '');
    }
  }, [visible, node]);

  const handleSave = () => {
    if (node) {
      onSave(node.id, noteText);
    }
    onClose();
  };

  if (!node) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContainer}>
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
              
              <TextInput
                style={styles.textInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="ここにノートを入力してください..."
                placeholderTextColor="#94a3b8"
                multiline
                autoFocus
                textAlignVertical="top"
              />

              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
  textInput: {
    height: 200,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
