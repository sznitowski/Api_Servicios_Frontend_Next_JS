// src/components/RatingStars.tsx
'use client';

export default function RatingStars({
  value,
  count,
  size = 16,
}: { value?: number | null; count?: number | null; size?: number }) {
  const v = Math.max(0, Math.min(5, Number(value ?? 0)));
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  const Star = ({ fill }: { fill: 'full' | 'half' | 'empty' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className="inline-block mr-0.5">
      {fill === 'full' && <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>}
      {fill === 'half' && (
        <>
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor"/>
              <stop offset="50%" stopColor="transparent"/>
            </linearGradient>
          </defs>
          <path fill="url(#half)" stroke="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </>
      )}
      {fill === 'empty' && <path fill="none" stroke="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>}
    </svg>
  );

  return (
    <span className="text-yellow-500">
      {Array.from({ length: full }).map((_, i) => <Star key={`f${i}`} fill="full" />)}
      {half && <Star fill="half" />}
      {Array.from({ length: empty }).map((_, i) => <Star key={`e${i}`} fill="empty" />)}
      <span className="text-xs text-gray-600 ml-1 align-middle">({count ?? 0})</span>
    </span>
  );
}
