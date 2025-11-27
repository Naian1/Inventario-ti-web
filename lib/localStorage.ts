import { InventoryData } from './types';
import { nanoid } from 'nanoid';
import type { Activity, DuplicateConfig } from './types';

const STORAGE_KEY = 'inventoryData';
const USER_KEY = 'currentUser';

export function getInitialData(): InventoryData {
  if (typeof window === 'undefined') {
    return {
      categories: [],
      fields: [],
      items: [],
      users: [{ username: 'admin', role: 'admin' }],
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {
        categories: [],
        fields: [],
        items: [],
        users: [{ username: 'admin', role: 'admin' }],
      };
    }
  }

  // Initial seed data
  const data: InventoryData = {
    categories: [],
    fields: [],
    items: [],
    activities: [],
    duplicateConfig: { fields: [] },
    users: [
      { username: 'admin', role: 'admin' },
      { username: 'usuario', role: 'user' },
    ],
  };
  saveData(data);
  return data;
}

export function saveData(data: InventoryData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addActivity(act: Omit<Activity, 'id' | 'time'>) {
  if (typeof window === 'undefined') return;
  const data = getInitialData();
  const activity: Activity = {
    id: nanoid(),
    time: new Date().toISOString(),
    ...act,
  } as Activity;
  data.activities = data.activities || [];
  data.activities.unshift(activity);
  // keep last 200 activities
  if (data.activities.length > 200) data.activities = data.activities.slice(0, 200);
  saveData(data);
}

export function getActivities(): Activity[] {
  const data = getInitialData();
  return data.activities || [];
}

export function getDuplicateConfig(): DuplicateConfig {
  const data = getInitialData();
  return data.duplicateConfig || { fields: [] };
}

export function saveDuplicateConfig(cfg: DuplicateConfig) {
  const data = getInitialData();
  data.duplicateConfig = cfg;
  saveData(data);
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return { username: 'admin', role: 'admin' as const };
  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { username: 'admin', role: 'admin' as const };
    }
  }
  return { username: 'admin', role: 'admin' as const };
}

export function setCurrentUser(user: { username: string; role: 'admin' | 'user' }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user.role === 'admin';
}

export function canManageCategories(): boolean {
  return isAdmin();
}

export function canAddItems(): boolean {
  // Todos podem adicionar itens
  return true;
}
