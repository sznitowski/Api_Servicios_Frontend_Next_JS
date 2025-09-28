export type RequestStatus = 'NEW' | 'OFFERED' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export type ServiceType = {
  id: number;
  name: string;
};

export type RequestItem = {
  id: number;
  title: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  status: RequestStatus;
  serviceType?: ServiceType | null;

  priceOffered?: number | null;
  priceAgreed?: number | null;

  createdAt: string;
  updatedAt: string;

  client?: { id: number; email: string } | null;
  provider?: { id: number; email: string } | null;
};

export type RequestListResp = {
  items: RequestItem[];
  meta: { page: number; limit: number; total: number; pages: number };
};
