import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList } from 'react-native';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { MindMapPage } from '../types';

interface SidebarProps {
  pages: MindMapPage[];
  activePageId: string | null;
  onSelectPage: (id: string) => void;
  onCreatePage: () => void;
  onDeletePage: (id: string) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pages,
  activePageId,
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
});
