"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/config";

type Tokens = { accessToken: string | null; refreshToken?: string | null };

type AuthContextType = {
  tokens: Tokens;
  token: string | null;              // <- acceso directo cómodo
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokens: (t: Tokens) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<Tokens>(() => {
    if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
    const raw = localStorage.getItem("tokens");
    return raw ? JSON.parse(raw) : { accessToken: null, refreshToken: null };
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tokens", JSON.stringify(tokens));
    }
  }, [tokens]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    setTokens({ accessToken: data.accessToken ?? null, refreshToken: data.refreshToken ?? null });
  };

  const logout = () => {
    setTokens({ accessToken: null, refreshToken: null });
    if (typeof window !== "undefined") localStorage.removeItem("tokens");
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  const value = useMemo(
    () => ({ tokens, token: tokens.accessToken ?? null, login, logout, setTokens }),
    [tokens]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
