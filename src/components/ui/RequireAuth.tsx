"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

/** Calcula el valor de ?next=... para volver después del login */
function useNextParam() {
  const pathname = usePathname();
  const search = useSearchParams();
  return React.useMemo(() => {
    const q = search?.toString();
    const url = q ? `${pathname}?${q}` : pathname || "/";
    return encodeURIComponent(url);
  }, [pathname, search]);
}

/** Botón que, si no hay sesión, envía al login con ?next=; si hay sesión, ejecuta onClick */
export function RequireAuthButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { token } = useAuth();
  const router = useRouter();
  const next = useNextParam();

  const { onClick, ...rest } = props;

  function handle(e: React.MouseEvent<HTMLButtonElement>) {
    if (!token) {
      e.preventDefault();
      router.push(`/login?next=${next}`);
      return;
    }
    onClick?.(e);
  }

  return <button {...rest} onClick={handle} />;
}

/** Banner simple para invitar a iniciar sesión */
export function LoginGateBanner({ className = "" }: { className?: string }) {
  const next = useNextParam();
  return (
    <div className={`rounded-xl border p-4 bg-gray-50 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">Ingresá para solicitar un servicio</div>
          <div className="text-sm text-gray-600">
            Podrás chatear, negociar y hacer seguimiento de tus pedidos.
          </div>
        </div>
        <Link
          href={`/login?next=${next}`}
          className="rounded-lg bg-black text-white px-4 py-2"
        >
          Ingresar
        </Link>
      </div>
    </div>
  );
}

/** Wrapper opcional por si querés ocultar contenido cuando no hay sesión */
export default function RequireAuth({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { token } = useAuth();
  return <>{token ? children : fallback}</>;
}
