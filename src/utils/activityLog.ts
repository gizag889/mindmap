import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ActivityLogEntry {
  id: string;
  type: 'note' | 'chat';
  pageId: string;
  nodeId: string;
  nodeLabel: string;
  snippet: string;
  timestamp: number;
}

const ACTIVITY_LOG_KEY = '@mindmap_activity_log';
const MAX_LOGS = 50;

export const addActivityLog = async (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
  try {
    const json = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
    const logs: ActivityLogEntry[] = json ? JSON.parse(json) : [];
    
    const newEntry: ActivityLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    const newLogs = [newEntry, ...logs].slice(0, MAX_LOGS);
    await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(newLogs));
  } catch (e) {
    console.error('Failed to add activity log', e);
  }
};

export const getActivityLogs = async (): Promise<ActivityLogEntry[]> => {
  try {
    const json = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to get activity logs', e);
    return [];
  }
};

export const clearActivityLogs = async () => {
  try {
    await AsyncStorage.removeItem(ACTIVITY_LOG_KEY);
  } catch (e) {
    console.error('Failed to clear activity logs', e);
  }
};
