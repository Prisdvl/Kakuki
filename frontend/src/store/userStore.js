import { create } from 'zustand';
import { getUserProfile } from '../api/user';

const useUserStore = create((set) => ({
  user: null,
  isLoggedIn: !!localStorage.getItem('access_token'),
  loading: false,

  setUser: (user) => set({ user, isLoggedIn: true }),

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isLoggedIn: false });
  },

  fetchUser: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    set({ loading: true });
    try {
      const res = await getUserProfile();
      set({ user: res.data, isLoggedIn: true });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isLoggedIn: false });
    } finally {
      set({ loading: false });
    }
  },
}));

export default useUserStore;
