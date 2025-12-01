import { create } from 'zustand';
import type { User, Song, Setlist, FriendWithUser } from '@/types';
import { apiClient } from '@/services/api';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Data
  songs: Song[];
  setlists: Setlist[];
  friends: FriendWithUser[];
  pendingRequests: FriendWithUser[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setSongs: (songs: Song[]) => void;
  setSetlists: (setlists: Setlist[]) => void;
  setFriends: (friends: FriendWithUser[]) => void;
  setPendingRequests: (requests: FriendWithUser[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  loadUserData: () => Promise<void>;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: apiClient.isAuthenticated(),
  songs: [],
  setlists: [],
  friends: [],
  pendingRequests: [],
  isLoading: false,
  error: null,
  
  // Sync actions
  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setSongs: (songs) => set({ songs }),
  setSetlists: (setlists) => set({ setlists }),
  setFriends: (friends) => set({ friends }),
  setPendingRequests: (pendingRequests) => set({ pendingRequests }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Async actions
  loadUserData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [user, songs, setlists, friends, pendingRequests] = await Promise.all([
        apiClient.getProfile(),
        apiClient.getSongs(),
        apiClient.getSetlists(),
        apiClient.getFriends(),
        apiClient.getPendingRequests(),
      ]);
      
      set({
        user,
        songs,
        setlists,
        friends,
        pendingRequests,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      set({
        error: 'Errore nel caricamento dei dati',
        isLoading: false,
      });
    }
  },
  
  logout: () => {
    apiClient.logout();
    set({
      user: null,
      isAuthenticated: false,
      songs: [],
      setlists: [],
      friends: [],
      pendingRequests: [],
    });
  },
}));
