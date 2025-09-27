import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from './auth/AuthContext';

export const metadata: Metadata = { title: 'App Servicios' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
