import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import NotifToaster from "@/components/NotifToaster";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ padding: 16 }}>{children}</main>
          <NotifToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
