// app/components/PermissionGate.tsx
import { useAuth } from "~/contexts/AuthContext";
import type { UserRole } from "~/lib/authRest";

interface PermissionGateProps {
  children: React.ReactNode;
  menuCode?: string;
  action?: "ver" | "crear" | "editar" | "eliminar";
  roles?: UserRole[];
  fallback?: React.ReactNode;
  requireOptica?: boolean;
}

// Componente para renderizado condicional basado en permisos
export function PermissionGate({
  children,
  menuCode,
  action = "ver",
  roles,
  fallback = null,
  requireOptica = false,
}: PermissionGateProps) {
  const { canAccess, hasRole, config } = useAuth();

  // Si requiere módulo óptica y está desactivado
  if (requireOptica && !config?.mostrarModuloOptica) {
    return <>{fallback}</>;
  }

  // Verificar rol si se especifica
  if (roles && !hasRole(roles)) {
    return <>{fallback}</>;
  }

  // Verificar permiso de menú si se especifica
  if (menuCode && !canAccess(menuCode, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Componente específico para botones de acción
interface ActionButtonGateProps {
  children: React.ReactNode;
  menuCode: string;
  action: "crear" | "editar" | "eliminar";
}

export function ActionButtonGate({ children, menuCode, action }: ActionButtonGateProps) {
  const { canAccess } = useAuth();

  if (!canAccess(menuCode, action)) {
    return null;
  }

  return <>{children}</>;
}

// Componente para mostrar contenido solo a Master
export function MasterOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isMaster } = useAuth();

  if (!isMaster) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Componente para mostrar contenido solo a Admin o Master
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
