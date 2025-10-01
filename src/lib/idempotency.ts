export function makeIdemKey(seed?: string) {
  const rnd =
    seed ??
    (globalThis.crypto as any)?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `req:${rnd}`;
}
