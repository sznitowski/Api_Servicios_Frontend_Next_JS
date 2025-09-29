import type { ProviderSearchResponse, SortKey } from '@/types/providers';

export async function searchProviders(params: {
  categoryId?: number;
  serviceTypeId?: number;
  lat: number;
  lng: number;
  radiusKm?: number;
  sort?: SortKey;
  minRating?: number;
  minReviews?: number;
  minPrice?: number;
  maxPrice?: number;
  hasPhoto?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.categoryId)    qs.set('categoryId', String(params.categoryId));
  if (params.serviceTypeId) qs.set('serviceTypeId', String(params.serviceTypeId));
  qs.set('lat', String(params.lat));
  qs.set('lng', String(params.lng));
  if (params.radiusKm!=null) qs.set('radiusKm', String(params.radiusKm));
  if (params.sort)           qs.set('sort', params.sort);
  if (params.minRating!=null)  qs.set('minRating', String(params.minRating));
  if (params.minReviews!=null) qs.set('minReviews', String(params.minReviews));
  if (params.minPrice!=null)   qs.set('minPrice', String(params.minPrice));
  if (params.maxPrice!=null)   qs.set('maxPrice', String(params.maxPrice));
  if (params.hasPhoto)       qs.set('hasPhoto', 'true');
  if (params.q?.trim())      qs.set('q', params.q.trim());
  if (params.page)           qs.set('page', String(params.page));
  if (params.limit)          qs.set('limit', String(params.limit));

  const res = await fetch(`/api/providers/search?${qs.toString()}`);
  if (!res.ok) throw new Error(`searchProviders ${res.status}`);
  return (await res.json()) as ProviderSearchResponse;
}
