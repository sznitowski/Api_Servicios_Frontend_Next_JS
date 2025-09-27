export type NotificationItem = {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  seenAt?: string | null;
  request?: { id: number; title: string; status: string } | null;
};
export type ListResponse = {
  items: NotificationItem[];
  meta: { page: number; limit: number; total: number; pages: number };
};
