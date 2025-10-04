// src/lib/awaitParams.ts
import type { Metadata } from "next";
import type { ReactElement } from "react";

/** Querystring tipado por defecto */
export type DefaultSearchParams = Record<string, string | string[] | undefined>;

/**
 * Envuelve generateMetadata para poder usar `params` como Promise y tiparlo.
 * Uso:
 *   export const generateMetadata = awaitedMetadata<{ id: string }>(async ({ id }) => { ... })
 */
export function awaitedMetadata<P extends Record<string, unknown> = {}>(
  fn: (params: P) => Promise<Metadata> | Metadata
) {
  return async ({ params }: { params: Promise<P> }): Promise<Metadata> => {
    const awaited = await params;
    return fn(awaited);
  };
}

/**
 * Envuelve páginas server para “esperar” params/searchParams (Promises) y tiparlos.
 * Uso:
 *   export default withAwaitedPage<{ id: string }, MySearch>(async ({ params, searchParams }) => { ... })
 */
export function withAwaitedPage<
  P extends Record<string, unknown> = {},
  Q extends DefaultSearchParams = DefaultSearchParams
>(
  fn: (args: { params: P; searchParams: Q }) => Promise<ReactElement> | ReactElement
) {
  return async ({
    params,
    searchParams,
  }: {
    params: Promise<P>;
    searchParams: Promise<Q>;
  }): Promise<ReactElement> => {
    const [p, q] = await Promise.all([params, searchParams]);
    return fn({ params: p, searchParams: q });
  };
}
