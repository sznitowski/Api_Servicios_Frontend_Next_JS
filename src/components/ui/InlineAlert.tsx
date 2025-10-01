'use client';

type Props = {
  kind?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
};

const styles: Record<NonNullable<Props['kind']>, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

export default function InlineAlert({ kind = 'info', children, className = '' }: Props) {
  return (
    <div className={`border rounded-md px-3 py-2 text-sm ${styles[kind]} ${className}`}>
      {children}
    </div>
  );
}
