import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MindMapPage, MindMapData } from '../types';

const PAGES_STORAGE_KEY = '@mindmap_pages';
const LEGACY_MINDMAP_KEY = '@mindmap_data';
const ACTIVE_PAGE_KEY = '@mindmap_active_page';

export const useMindMapPages = () => {
  const [pages, setPages] = useState<MindMapPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPages = async () => {
      try {
        const pagesJson = await AsyncStorage.getItem(PAGES_STORAGE_KEY);
        let loadedPages: MindMapPage[] = [];
        
        if (pagesJson) {
          loadedPages = JSON.parse(pagesJson);
        } else {
          // Check for legacy data
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
              
              // Move legacy data to new key
              await AsyncStorage.setItem(`@mindmap_data_${newPageId}`, legacyDataJson);
              await AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(loadedPages));
            }
          }
        }
        
        const sortedPages = loadedPages.sort((a, b) => b.updatedAt - a.updatedAt);
        setPages(sortedPages);
        
        const lastActivePageId = await AsyncStorage.getItem(ACTIVE_PAGE_KEY);
        if (lastActivePageId && sortedPages.some(p => p.id === lastActivePageId)) {
          setActivePageId(lastActivePageId);
        }
      } catch (error) {
        console.error('Failed to load pages', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadPages();
  }, []);

  const handleSetActivePageId = useCallback((id: string | null) => {
    setActivePageId(id);
    if (id) {
      AsyncStorage.setItem(ACTIVE_PAGE_KEY, id).catch(e => console.error(e));
    } else {
      AsyncStorage.removeItem(ACTIVE_PAGE_KEY).catch(e => console.error(e));
    }
  }, []);

  const createNewPage = useCallback(async () => {
    const newPage: MindMapPage = {
      id: `page_${Date.now()}`,
      title: '新しいページ',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const updatedPages = [newPage, ...pages].sort((a, b) => b.updatedAt - a.updatedAt);
    setPages(updatedPages);
    await AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(updatedPages));
    
    // Set as active page
    handleSetActivePageId(newPage.id);
    return newPage.id;
  }, [pages, handleSetActivePageId]);

  const updatePage = useCallback(async (id: string, updates: Partial<MindMapPage>) => {
    setPages(prevPages => {
      const newPages = prevPages.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
                                .sort((a, b) => b.updatedAt - a.updatedAt);
      AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(newPages)).catch(e => console.error(e));
      return newPages;
    });
  }, []);

  const deletePage = useCallback(async (id: string) => {
    setPages(prevPages => {
      const newPages = prevPages.filter(p => p.id !== id);
      AsyncStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(newPages)).catch(e => console.error(e));
      return newPages;
    });
    await AsyncStorage.removeItem(`@mindmap_data_${id}`);
    if (activePageId === id) {
      handleSetActivePageId(null);
    }
  }, [activePageId, handleSetActivePageId]);

  return {
    pages,
    activePageId,
    setActivePageId: handleSetActivePageId,
    createNewPage,
    updatePage,
    deletePage,
    isLoaded
  };
};
