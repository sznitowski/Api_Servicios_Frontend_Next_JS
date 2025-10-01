'use client';

export default function Spinner({ size = 24 }: { size?: number }) {
  const px = `${size}px`;
  return (
    <div
      className="inline-block animate-spin rounded-full border-4 border-gray-200 border-t-gray-600"
      style={{ width: px, height: px }}
      aria-label="Cargando"
    />
  );
}
