"use client";

export default function ErrorBanner({
  message,
  onClose,
}: { message?: string | null; onClose?: () => void }) {
  if (!message) return null;
  return (
    <div className="bg-red-100 border border-red-300 text-red-800 px-3 py-2 rounded mb-3">
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-700 hover:text-red-900 font-semibold"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
