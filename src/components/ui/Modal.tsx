'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  zIndex?: number;
  className?: string;         // caja de contenido
  backdropClassName?: string; // fondo
};

export default function Modal({
  open,
  onClose,
  children,
  zIndex = 10000,
  className = '',
  backdropClassName = '',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 bg-black/40 ${backdropClassName}`}
        onClick={onClose}
        aria-hidden
      />
      <div className={`relative bg-white rounded-xl shadow-2xl ${className}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
