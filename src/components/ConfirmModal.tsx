import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';

import { useMindMapStore } from '../store/useMindMapStore';

interface ConfirmModalProps {
  title?: string;
  message?: string;
  warningMessage?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title = "ノードの削除",
  message = "本当に削除しますか？",
  warningMessage = "※削除されるノード以下の子ノードすべて削除されます。",
}) => {
  const nodeIdToDelete = useMindMapStore(state => state.nodeIdToDelete);
  const onConfirm = useMindMapStore(state => state.confirmDeleteNode);
  const onCancel = useMindMapStore(state => state.cancelDeleteNode);
  
  const visible = nodeIdToDelete !== null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.message}>{message}</Text>
            {warningMessage && (
              <Text style={styles.warning}>{warningMessage}</Text>
            )}
          </View>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={onConfirm}>
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    padding: 16,
    gap: 12,
  },
  message: {
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 22,
  },
  warning: {
    color: '#ef4444',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
