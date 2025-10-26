import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/ui/Navbar";
import MobileTabBar from "@/components/ui/MobileTabBar";
import NotifToaster from "@/components/NotifToaster";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="bg-white text-gray-900" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white">
        <AuthProvider>
          {/* Top bar en desktop/tablet */}
          <div className="hidden md:block">
            <Navbar />
          </div>
          {/* Bottom bar en mobile */}
          <MobileTabBar />

          {/* Contenido con padding inferior para que no lo tape la tab bar */}
          <main className="pb-16 px-4">{children}</main>

          <NotifToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
