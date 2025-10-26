"use client";

import React, { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

export default function BottomSheet({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[61] max-h-[82vh] overflow-auto rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto w-full max-w-2xl p-4">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200" />
          {title && <h3 className="mb-3 text-lg font-semibold">{title}</h3>}
          {children}
        </div>
      </div>
    </>
  );
}
