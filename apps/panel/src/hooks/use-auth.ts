"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }
    api
      .get("/auth/me")
      .then(() => {
        setAuthenticated(true);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setAuthenticated(false);
        setLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      setAuthenticated(true);
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setAuthenticated(false);
    router.push("/login");
  }, [router]);

  return { loading, authenticated, login, logout };
}
