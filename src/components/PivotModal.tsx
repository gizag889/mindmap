import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { useMindMapStore } from '../store/useMindMapStore';

export const PivotModal: React.FC = () => {
  const pivotModalNodeId = useMindMapStore(state => state.pivotModalNodeId);
  const setPivotModalNodeId = useMindMapStore(state => state.setPivotModalNodeId);
  const nodes = useMindMapStore(state => state.data.nodes);
  const onToggleCollapse = useMindMapStore(state => state.handleToggleCollapse);

  const node = nodes.find(n => n.id === pivotModalNodeId) || null;
  const visible = pivotModalNodeId !== null;

  const onClose = () => setPivotModalNodeId(null);

  if (!node || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>AI 生成履歴</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.promptLabel}>プロンプト:</Text>
            <Text style={styles.promptText}>{node.promptText || '記録なし'}</Text>
          </View>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>閉じる</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => {
                onToggleCollapse(node.id, !node.isCollapsed);
                onClose();
              }}
            >
              <Text style={styles.actionButtonText}>
                {node.isCollapsed ? '展開する' : '収納する'}
              </Text>
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
    gap: 8,
  },
  promptLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  promptText: {
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
