"use client";

export default function EmptyState({ children }: { children?: React.ReactNode }) {
  return (
    <div className="text-center text-gray-500 py-10">
      {children ?? "Sin resultados."}
    </div>
  );
}
