import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@mindmap_settings';

export type AiMode = 'flash' | 'pro';

export interface AppSettings {
  aiMode: AiMode;
}

const defaultSettings: AppSettings = {
  aiMode: 'flash',
};

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  updateSettings: (updates: Partial<AppSettings>) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,
  updateSettings: async (updates: Partial<AppSettings>) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
  loadSettings: async () => {
    if (get().isLoaded) return;
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        set({ settings: { ...defaultSettings, ...JSON.parse(stored) }, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoaded: true });
    }
  }
}));
