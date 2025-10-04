// src/lib/routeAfterAuth.ts

export type MeLite = { id: number; role?: string | null };

/** Router mínimo que nos interesa (useRouter() lo cumple) */
export type RouterLike = { replace: (href: string) => void };

/** Redirige según el rol (y respeta ?next= si es seguro). */
export function gotoHomeForUser(
  router: RouterLike,
  me: MeLite | null | undefined,
  next?: string | null
) {
  // Deep-link seguro: sólo paths absolutos dentro del sitio y que NO empiecen con //
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (safeNext) {
    router.replace(safeNext);
    return;
  }

  const role = String(me?.role || "").toUpperCase();
  switch (role) {
    case "PROVIDER":
      router.replace("/providers/my");
      break;
    case "ADMIN":
      router.replace("/dashboard");
      break;
    default:
      router.replace("/services");
  }
}
