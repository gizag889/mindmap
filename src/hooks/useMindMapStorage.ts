import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MindMapData, MindMapPage } from '../types';

export const useMindMapStorage = (
  pageId: string | null,
  onUpdatePage?: (id: string, updates: Partial<MindMapPage>) => void
) => {
  const [data, setData] = useState<MindMapData>({ nodes: [], edges: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!pageId) {
      setData({ nodes: [], edges: [] });
      setIsLoaded(true);
      return;
    }

    const loadData = async () => {
      setIsLoaded(false);
      try {
        //  AsyncStorage からマップデータを取得（ロード）しています
        const jsonValue = await AsyncStorage.getItem(`@mindmap_data_${pageId}`);
        if (jsonValue != null) {
          const parsedData = JSON.parse(jsonValue);
          setData(parsedData);
        } else {
          setData({ nodes: [], edges: [] });
        }
      } catch (e) {
        console.error('Error loading mindmap data from AsyncStorage:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, [pageId]);

  //最新のデータを AsyncStorage に書き込む（保存する）。
  useEffect(() => {
    if (!isLoaded || !pageId) return;
    const saveData = async () => {
      try {
        const jsonValue = JSON.stringify(data);
        await AsyncStorage.setItem(`@mindmap_data_${pageId}`, jsonValue);
        
        if (data.nodes.length > 0 && onUpdatePage) {
          const rootNode = data.nodes.find(n => !n.parentId) || data.nodes[0];
          onUpdatePage(pageId, { title: rootNode.label, updatedAt: Date.now() });
        }
      } catch (e) {
        console.error('Error saving mindmap data to AsyncStorage:', e);
      }
    };
    saveData();
  }, [data, isLoaded, pageId]);

  return {
    data,
    setData,
    isLoaded,
  };
};
