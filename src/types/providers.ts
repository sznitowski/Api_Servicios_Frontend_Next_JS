export type SortKey = 'distance' | 'rating' | 'price';

// src/types/providers.ts
export type ProviderSearchItem = {
  providerUserId: number;
  displayName: string;
  serviceTypeId: number;
  serviceTypeName: string;
  basePrice: string | number | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  distanceKm?: number | null;
};

export type Paged<T> = {
  items: T[];
  meta?: { page: number; limit: number; total: number; pages: number };
};

