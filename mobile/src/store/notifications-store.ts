import { create } from "zustand";

interface NotificationsState {
  unreadCount: number;
  setUnreadCount: (value: number) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
}));
