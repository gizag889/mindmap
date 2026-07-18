import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MindMapPage, MindMapData } from '../types';

const PAGES_STORAGE_KEY = '@mindmap_pages';
const LEGACY_MINDMAP_KEY = '@mindmap_data';
const ACTIVE_PAGE_KEY = '@mindmap_active_page';

interface MindMapPagesState {
  pages: MindMapPage[];
  activePageId: string | null;
  isLoaded: boolean;
  loadPages: () => Promise<void>;
  setActivePageId: (id: string | null) => Promise<void>;
  createNewPage: () => Promise<void>;
  updatePage: (id: string, updates: Partial<MindMapPage>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
}

export const useMindMapPagesStore = create<MindMapPagesState>((set, get) => ({
  pages: [],
  activePageId: null,
  isLoaded: false,

  loadPages: async () => {
    if (get().isLoaded) return;
    try {
      const pagesJson = await AsyncStorage.getItem(PAGES_STORAGE_KEY);
      let loadedPages: MindMapPage[] = [];
      
      if (pagesJson) {
        loadedPages = JSON.parse(pagesJson);
      } else {
        const legacyDataJson = await AsyncStorage.getItem(LEGACY_MINDMAP_KEY);
        if (legacyDataJson) {
          const legacyData: MindMapData = JSON.parse(legacyDataJson);
          if (legacyData.nodes && legacyData.nodes.length > 0) {
            const rootNode = legacyData.nodes.find(n => !n.parentId) || legacyData.nodes[0];
            const newPageId = `page_${Date.now()}`;
            const legacyPage: MindMapPage = {
              id: newPageId,
              title: rootNode.label,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            loadedPages = [legacyPage];
            await AsyncStorage.setItem(`@mindmap_data_${newPageId}`, legacyDataJson);
            await AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(loadedPages));
            await AsyncStorage.removeItem(LEGACY_MINDMAP_KEY);
          }
        }
      }

      set({ pages: loadedPages });

      const savedActivePageId = await AsyncStorage.getItem(ACTIVE_PAGE_KEY);
      if (savedActivePageId && loadedPages.some(p => p.id === savedActivePageId)) {
        set({ activePageId: savedActivePageId });
      } else if (loadedPages.length > 0) {
        set({ activePageId: loadedPages[0].id });
        await AsyncStorage.setItem(ACTIVE_PAGE_KEY, loadedPages[0].id);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      set({ isLoaded: true });
    }
  },

  setActivePageId: async (id: string | null) => {
    set({ activePageId: id });
    try {
      if (id) {
        await AsyncStorage.setItem(ACTIVE_PAGE_KEY, id);
      } else {
        await AsyncStorage.removeItem(ACTIVE_PAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving active page:', error);
    }
  },

  createNewPage: async () => {
    const newPage: MindMapPage = {
      id: `page_${Date.now()}`,
      title: '新しいマップ',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newPages = [...get().pages, newPage];
    set({ pages: newPages, activePageId: newPage.id });

    try {
      await AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(newPages));
      await AsyncStorage.setItem(ACTIVE_PAGE_KEY, newPage.id);
    } catch (error) {
      console.error('Error creating new page:', error);
    }
  },

  updatePage: async (id: string, updates: Partial<MindMapPage>) => {
    const pages = get().pages;
    const newPages = pages.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    set({ pages: newPages });
    try {
      await AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(newPages));
    } catch (error) {
      console.error('Error updating page:', error);
    }
  },

  deletePage: async (id: string) => {
    const pages = get().pages;
    const newPages = pages.filter(p => p.id !== id);
    let newActivePageId = get().activePageId;

    if (newActivePageId === id) {
      newActivePageId = newPages.length > 0 ? newPages[0].id : null;
    }

    set({ pages: newPages, activePageId: newActivePageId });

    try {
      await AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(newPages));
      await AsyncStorage.removeItem(`@mindmap_data_${id}`);
      if (newActivePageId) {
        await AsyncStorage.setItem(ACTIVE_PAGE_KEY, newActivePageId);
      } else {
        await AsyncStorage.removeItem(ACTIVE_PAGE_KEY);
      }
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  }
}));
