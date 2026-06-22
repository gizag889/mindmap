import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { MindMapPage } from '../types';
import { AiMode } from '../hooks/useSettings';

interface SidebarProps {
  pages: MindMapPage[];
  activePageId: string | null;
  aiMode: AiMode;
  onModeChange: (mode: AiMode) => void;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onDeletePage: (id: string) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pages,
  activePageId,
  aiMode,
  onModeChange,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onClose
}) => {
  return (
    <Animated.View 
      style={styles.container}
      entering={SlideInLeft}
      exiting={SlideOutLeft}
    >
      <View style={styles.header}>
        <Text style={styles.title}>ページ一覧</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.createButton} onPress={onCreatePage}>
        <Text style={styles.createButtonText}>＋ 新規ページ作成</Text>
      </TouchableOpacity>
      
      <FlatList
        data={pages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isActive = item.id === activePageId;
          const date = new Date(item.updatedAt);
          return (
            <TouchableOpacity 
              style={[styles.pageItem, isActive && styles.activePageItem]}
              onPress={() => onSelectPage(item.id)}
            >
              <View style={styles.pageInfo}>
                <Text style={[styles.pageTitle, isActive && styles.activePageTitle]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.pageDate}>
                  {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => {
                  // In a real app we might want an alert confirmation here
                  onDeletePage(item.id);
                }}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>AIモード設定</Text>
        <TouchableOpacity 
          style={[styles.modeButton, aiMode === 'flash' && styles.activeModeButton]}
          onPress={() => onModeChange('flash')}
        >
          <Text style={[styles.modeButtonText, aiMode === 'flash' && styles.activeModeText]}>
            ⚡ 高速 / アイデア量産
          </Text>
          <Text style={styles.modeSubText}>gemini-3.5-flash</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modeButton, aiMode === 'pro' && styles.activeModeButton]}
          onPress={() => onModeChange('pro')}
        >
          <Text style={[styles.modeButtonText, aiMode === 'pro' && styles.activeModeText]}>
            🧠 深掘り / 構造化アシスト
          </Text>
          <Text style={styles.modeSubText}>gemini-3.1-pro-preview</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 280,
    backgroundColor: '#1e293b',
    borderRightWidth: 1,
    borderRightColor: '#334155',
    zIndex: 100,
    paddingTop: 40, // For status bar area
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 18,
  },
  createButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pageItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activePageItem: {
    backgroundColor: '#0f172a',
    borderLeftWidth: 4,
    borderLeftColor: '#60a5fa',
  },
  pageInfo: {
    flex: 1,
    marginRight: 8,
  },
  pageTitle: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 4,
  },
  activePageTitle: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  pageDate: {
    color: '#64748b',
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  settingsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#0f172a',
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modeButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  activeModeButton: {
    borderColor: '#60a5fa',
    backgroundColor: '#1e293b',
  },
  modeButtonText: {
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  activeModeText: {
    color: '#60a5fa',
  },
  modeSubText: {
    color: '#64748b',
    fontSize: 10,
  },
});
