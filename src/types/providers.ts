export type SortKey = 'distance' | 'rating' | 'price';

export interface ProviderItem {
  providerUserId: number;
  displayName: string | null;
  photoUrl: string | null;
  ratingAvg: string;
  ratingCount: number;
  basePrice: string | null;
  serviceTypeName: string | null;
  distanceKm: number;
  location: { lat: number; lng: number };
}

export interface ProviderSearchResponse {
  items: ProviderItem[];
  meta: { page: number; limit: number; total: number; pages: number };
}
