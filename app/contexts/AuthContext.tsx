// app/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
  switchDatabase as apiSwitchDatabase,
  type AuthUser,
  type AuthConfig,
  type UserRole,
  hasPermission,
  hasRole,
} from "~/lib/authRest";

interface AuthContextType {
  user: AuthUser | null;
  config: AuthConfig | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentDatabase: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (username: string, password: string) => Promise<void>;
  switchDatabase: (database: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  canAccess: (menuCode: string, action?: "ver" | "crear" | "editar" | "eliminar") => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  isMaster: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "token";
const DATABASE_KEY = "currentDatabase";

// Helper para acceder a localStorage de forma segura (solo en cliente)
const getStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
};

const removeStorageItem = (key: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const currentDatabase = user?.currentDatabase ?? null;
  const isAuthenticated = !!user;
  const isMaster = user?.role === "master";
  const isAdmin = user?.role === "admin" || isMaster;

  // Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cargar usuario al iniciar (solo en cliente)
  useEffect(() => {
    if (!isClient) return;

    const initAuth = async () => {
      const token = getStorageItem(TOKEN_KEY);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: userData, config: configData } = await getMe();
        setUser(userData);
        setConfig(configData);
        setStorageItem(DATABASE_KEY, userData.currentDatabase);
      } catch (error) {
        removeStorageItem(TOKEN_KEY);
        removeStorageItem(DATABASE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [isClient]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiLogin(username, password);

    setStorageItem(TOKEN_KEY, response.token);
    setStorageItem(DATABASE_KEY, response.user.currentDatabase);

    const { user: userData, config: configData } = await getMe();
    setUser(userData);
    setConfig(configData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignorar errores de logout
    } finally {
      removeStorageItem(TOKEN_KEY);
      removeStorageItem(DATABASE_KEY);
      setUser(null);
      setConfig(null);
    }
  }, []);

  // Cambio rápido de usuario sin cerrar la app
  const switchUser = useCallback(async (username: string, password: string) => {
    // Primero intentar login con el nuevo usuario (sin cerrar sesión actual)
    // Así si falla, el usuario sigue con su sesión actual
    const response = await apiLogin(username, password);

    // Solo si el login es exitoso, actualizar todo
    setStorageItem(TOKEN_KEY, response.token);
    setStorageItem(DATABASE_KEY, response.user.currentDatabase);

    const { user: userData, config: configData } = await getMe();
    setUser(userData);
    setConfig(configData);
  }, []);

  const switchDatabase = useCallback(async (database: string) => {
    const result = await apiSwitchDatabase(database);

    setStorageItem(DATABASE_KEY, result.currentDatabase);

    const { user: userData, config: configData } = await getMe();
    setUser({ ...userData, currentDatabase: result.currentDatabase });
    setConfig(configData);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getStorageItem(TOKEN_KEY);
    if (!token) return;

    try {
      const { user: userData, config: configData } = await getMe();
      setUser(userData);
      setConfig(configData);
    } catch {
      removeStorageItem(TOKEN_KEY);
      removeStorageItem(DATABASE_KEY);
      setUser(null);
      setConfig(null);
    }
  }, []);

  const canAccess = useCallback(
    (menuCode: string, action: "ver" | "crear" | "editar" | "eliminar" = "ver"): boolean => {
      if (!user) return false;
      // Solo Master tiene acceso total sin verificar permisos
      if (user.role === "master") return true;
      // Admin y User deben tener el permiso asignado
      return hasPermission(user.permisos || [], menuCode, action);
    },
    [user]
  );

  const checkRole = useCallback(
    (roles: UserRole[]): boolean => {
      if (!user) return false;
      return hasRole(user.role, roles);
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    config,
    isLoading: !isClient || isLoading,
    isAuthenticated,
    currentDatabase,
    login,
    logout,
    switchUser,
    switchDatabase,
    refreshUser,
    canAccess,
    hasRole: checkRole,
    isMaster,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useOpticaModule(): boolean {
  const { config, canAccess } = useAuth();

  if (!config?.mostrarModuloOptica) return false;
  return canAccess("optica.revisiones") || canAccess("optica.historial");
}
