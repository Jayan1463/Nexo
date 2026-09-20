import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  currentOrgId: string | null;
  currentProjectId: string | null;
  theme: 'light' | 'dark';
  isSidebarCollapsed: boolean;
  setUser: (user: User | null) => void;
  setOrg: (orgId: string | null) => void;
  setProject: (projectId: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  const savedTheme = localStorage.getItem('theme');
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
};

export const useAppStore = create<AppState>((set) => ({
  user: null,
  currentOrgId: null,
  currentProjectId: null,
  theme: getInitialTheme(),
  isSidebarCollapsed: false,
  setUser: (user) => set({ user }),
  setOrg: (currentOrgId) => set({ currentOrgId }),
  setProject: (currentProjectId) => set({ currentProjectId }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
}));
