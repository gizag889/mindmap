import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@mindmap_settings';

export type AiMode = 'flash' | 'pro';

export interface AppSettings {
  aiMode: AiMode;
}

const defaultSettings: AppSettings = {
  aiMode: 'flash',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (jsonValue != null) {
          setSettings(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error('Error loading settings:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  };

  return {
    settings,
    updateSettings,
    isLoaded,
  };
};
