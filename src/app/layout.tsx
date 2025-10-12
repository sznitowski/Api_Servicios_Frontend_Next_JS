import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import NotifToaster from "@/components/NotifToaster";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className="bg-white text-gray-900"
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        {/* Evita que el navegador/OS “oscurezca” el sitio automáticamente */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white">
        <AuthProvider>
          <Navbar />
          <main style={{ padding: 16 }}>{children}</main>
          <NotifToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
