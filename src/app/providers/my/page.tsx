"use client";
import { RequireAuth } from "@/lib/routeGuards";

export default function ProviderMyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protege SOLO /providers/my (y sus hijos) para rol PROVIDER.
  return <RequireAuth allow={["PROVIDER"]}>{children}</RequireAuth>;
}
