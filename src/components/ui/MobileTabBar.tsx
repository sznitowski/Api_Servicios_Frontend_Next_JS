"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotifBadge from "./../NotifBadge";

/**
 * Barra inferior para mobile.
 * - Se oculta en >= md
 * - Altura 56px (h-14). El padding inferior del <main> se maneja en globals.css (.pb-tabbar)
 * - NotifBadge no debe renderizar <Link> (solo el badge). Si lo hace, quitárselo.
 */
const items = [
  { href: "/services", label: "Servicios" },
  { href: "/requests", label: "Pedidos" },
  { href: "/notifications", label: "Notificaciones", hasBadge: true },
  { href: "/dashboard", label: "Inicio" },
  // { href: "/ai", label: "AI" }, // si querés 5 ítems, descomentar y ajustar grid-cols
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed bottom-0 inset-x-0 z-40 md:hidden
        border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70
      "
      role="navigation"
      aria-label="Navegación inferior"
    >
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className="
                  relative flex h-14 flex-col items-center justify-center
                  text-xs
                "
                aria-current={active ? "page" : undefined}
                prefetch={false}
              >
                <span className={`font-medium ${active ? "text-black" : "text-gray-500"}`}>
                  {it.label}
                </span>

                {it.hasBadge && (
                  <span className="absolute -top-1 right-6">
                    <NotifBadge />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
