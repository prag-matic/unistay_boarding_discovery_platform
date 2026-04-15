import { useNotificationStore } from '@/store/notification.store';

export function useNotifications() {
  return useNotificationStore();
}
