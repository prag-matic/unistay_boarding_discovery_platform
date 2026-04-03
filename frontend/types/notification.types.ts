export type NotificationType =
  | 'payment'
  | 'reservation'
  | 'message'
  | 'marketplace'
  | 'general';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}
