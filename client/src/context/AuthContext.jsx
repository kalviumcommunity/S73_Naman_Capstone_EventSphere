import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api, { getToken, setToken, setUnauthorizedHandler, errorMessage } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Declared with useCallback before the effect that uses it. The previous
  // version called logout() from inside its own initialiser effect, which threw
  // a ReferenceError whenever the stored user JSON failed to parse.
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  // Validate any stored token against the server on boot, so a revoked or
  // expired session does not leave the UI looking signed in.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/api/auth/me");
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    // The API now returns a token on registration, so the user lands signed in.
    const { data } = await api.post("/api/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const { data } = await api.patch("/api/me", updates);
    setUser(data.user);
    return data.user;
  }, []);

  /** Keeps the cached bookmark count in step after a bookmark toggle. */
  const setBookmarkCount = useCallback((bookmarkCount) => {
    setUser((current) => (current ? { ...current, bookmarkCount } : current));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile, setBookmarkCount, errorMessage }),
    [user, loading, login, register, logout, updateProfile, setBookmarkCount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
