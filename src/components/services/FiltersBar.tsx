'use client';

import { useEffect, useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { SortKey } from '@/types/providers';

type Props = {
  onChange: (s: {
    sort: SortKey;
    radiusKm: number;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    hasPhoto?: boolean;
    q?: string;
  }) => void;
  initialSort?: SortKey;
  initialRadiusKm?: number;
};

export default function FiltersBar({
  onChange,
  initialSort = 'distance',
  initialRadiusKm = 10,
}: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [sort, setSort] = useState<SortKey>((sp.get('sort') as SortKey) || initialSort);
  const [radiusKm, setRadiusKm] = useState<number>(Number(sp.get('radiusKm') ?? initialRadiusKm));
  const [minRating, setMinRating] = useState<number | undefined>(
    sp.get('minRating') ? Number(sp.get('minRating')) : undefined
  );
  const [minPrice, setMinPrice] = useState<number | undefined>(
    sp.get('minPrice') ? Number(sp.get('minPrice')) : undefined
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(
    sp.get('maxPrice') ? Number(sp.get('maxPrice')) : undefined
  );
  const [hasPhoto, setHasPhoto] = useState<boolean>(sp.get('hasPhoto') === 'true');
  const [q, setQ] = useState<string>(sp.get('q') ?? '');

  const pushParams = useCallback((state: {
    sort: SortKey; radiusKm: number; minRating?: number; minPrice?: number; maxPrice?: number; hasPhoto?: boolean; q?: string;
  }) => {
    const next = new URLSearchParams(sp.toString());
    next.set('sort', state.sort);
    next.set('radiusKm', String(state.radiusKm));
    state.minRating!=null ? next.set('minRating', String(state.minRating)) : next.delete('minRating');
    state.minPrice!=null  ? next.set('minPrice', String(state.minPrice))   : next.delete('minPrice');
    state.maxPrice!=null  ? next.set('maxPrice', String(state.maxPrice))   : next.delete('maxPrice');
    state.hasPhoto ? next.set('hasPhoto', 'true') : next.delete('hasPhoto');
    state.q?.trim() ? next.set('q', state.q.trim()) : next.delete('q');
    router.replace(`${pathname}?${next.toString()}`);
  }, [router, pathname, sp]);

  useEffect(() => {
    const s = { sort, radiusKm, minRating, minPrice, maxPrice, hasPhoto, q };
    pushParams(s);
    const t = setTimeout(() => onChange(s), 300);
    return () => clearTimeout(t);
  }, [sort, radiusKm, minRating, minPrice, maxPrice, hasPhoto, q, onChange, pushParams]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
      <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="border rounded px-2 py-1">
        <option value="distance">Distance</option>
        <option value="rating">Rating</option>
        <option value="price">Price</option>
      </select>

      <div className="col-span-2 flex items-center gap-2">
        <label className="whitespace-nowrap">Radius:</label>
        <input type="range" min={1} max={50} value={radiusKm}
          onChange={e => setRadiusKm(Number(e.target.value))} />
        <span className="w-12 text-right">{radiusKm} km</span>
      </div>

      <div className="flex items-center gap-2">
        <label>⭐</label>
        <input type="number" min={0} max={5} step={0.5}
          value={minRating ?? ''} placeholder="min"
          onChange={e => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
          className="w-20 border rounded px-2 py-1"/>
      </div>

      <div className="flex items-center gap-2">
        <label>$</label>
        <input className="w-20 border rounded px-2 py-1" type="number" min={0}
          value={minPrice ?? ''} placeholder="from"
          onChange={e => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}/>
        <span>-</span>
        <input className="w-20 border rounded px-2 py-1" type="number" min={0}
          value={maxPrice ?? ''} placeholder="to"
          onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}/>
      </div>

      <div className="flex items-center gap-2">
        <input id="photo" type="checkbox" checked={hasPhoto} onChange={e => setHasPhoto(e.target.checked)}/>
        <label htmlFor="photo">With photo</label>
      </div>

      <input
        className="md:col-span-2 border rounded px-2 py-1"
        placeholder="Search provider…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
    </div>
  );
}
