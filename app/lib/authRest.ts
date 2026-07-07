// app/lib/authRest.ts
import { api } from "./api";

// Tipos
export type UserRole = "master" | "admin" | "user";

export interface DatabaseAccess {
  id: number;
  nombre: string;
  dbName: string;
  rol: "admin" | "user";
  serieFacturacion?: string;
}

export interface MenuPermission {
  menuId: number;
  codigo: string;
  nombreEs: string;
  nombreCa: string;
  grupo: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export interface AuthUser {
  id: number | "master";
  username: string;
  nombre: string;
  email?: string;
  role: UserRole;
  databases: DatabaseAccess[];
  currentDatabase: string;
  permisos: MenuPermission[];
}

export interface AuthConfig {
  mostrarModuloOptica: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
  config: AuthConfig;
}

// Funciones de API
export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/auth/login", { username, password });
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getMe(): Promise<MeResponse> {
  const response = await api.get<MeResponse>("/auth/me");
  return response.data;
}

export async function switchDatabase(database: string): Promise<{ currentDatabase: string }> {
  const response = await api.post<{ message: string; currentDatabase: string }>(
    "/auth/switch-database",
    { database }
  );
  return { currentDatabase: response.data.currentDatabase };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.put("/auth/change-password", { currentPassword, newPassword });
}

// Tipos para gestión de usuarios
export interface Usuario {
  id: number;
  username: string;
  nombre: string;
  email: string | null;
  activo: boolean;
  rol: "admin" | "user";
  permisos?: MenuPermission[];
}

export interface Menu {
  id: number;
  codigo: string;
  nombre_es: string;
  nombre_ca: string;
  grupo: string;
  orden: number;
  requiere_modulo_optica: boolean;
  solo_master: boolean; // Módulos premium que solo Master puede asignar
}

export interface DatabaseAssignment {
  id: number;
  rol: "admin" | "user";
}

export interface CreateUserInput {
  username: string;
  password: string;
  nombre: string;
  email?: string;
  databases?: DatabaseAssignment[];
}

export interface UpdateUserInput {
  username?: string;
  nombre?: string;
  email?: string;
  activo?: boolean;
}

export interface PermissionInput {
  idMenu: number;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

// Funciones de gestión de usuarios (Admin)
export async function listUsers(): Promise<Usuario[]> {
  const response = await api.get<{ users: Usuario[] }>("/usuarios");
  return response.data.users;
}

export async function createUser(data: CreateUserInput): Promise<Usuario> {
  const response = await api.post<{ user: Usuario }>("/usuarios", data);
  return response.data.user;
}

export async function updateUser(id: number, data: UpdateUserInput): Promise<Usuario> {
  const response = await api.put<{ user: Usuario }>(`/usuarios/${id}`, data);
  return response.data.user;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/usuarios/${id}`);
}

export async function getUserPermissions(id: number): Promise<{ permisos: MenuPermission[]; menus: Menu[] }> {
  const response = await api.get<{ permisos: MenuPermission[]; menus: Menu[] }>(`/usuarios/${id}/permisos`);
  return response.data;
}

export async function setUserPermissions(id: number, permisos: PermissionInput[]): Promise<MenuPermission[]> {
  const response = await api.put<{ permisos: MenuPermission[] }>(`/usuarios/${id}/permisos`, { permisos });
  return response.data.permisos;
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  await api.post(`/usuarios/${id}/reset-password`, { newPassword });
}

export async function getMenus(): Promise<{ menus: Menu[]; config: AuthConfig }> {
  const response = await api.get<{ menus: Menu[]; config: AuthConfig }>("/menus");
  return response.data;
}

export async function getAvailableDatabases(): Promise<BaseDatos[]> {
  const response = await api.get<{ databases: BaseDatos[] }>("/databases");
  return response.data.databases;
}

// Funciones de administración (Master)
export interface BaseDatos {
  id: number;
  nombre: string;
  db_name: string;
  db_host: string;
  db_port: number;
  serie_facturacion: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracionGlobal {
  id: number;
  clave: string;
  valor: string | null;
  tipo: string;
  descripcion: string | null;
  solo_master: boolean;
}

export async function listDatabases(): Promise<BaseDatos[]> {
  const response = await api.get<{ databases: BaseDatos[] }>("/admin/bases-datos");
  return response.data.databases;
}

export async function createDatabase(data: { nombre: string; dbName: string; dbHost?: string; dbPort?: number }): Promise<BaseDatos> {
  const response = await api.post<{ database: BaseDatos }>("/admin/bases-datos", data);
  return response.data.database;
}

export async function updateDatabase(id: number, data: { nombre?: string; dbHost?: string; dbPort?: number; activa?: boolean }): Promise<BaseDatos> {
  const response = await api.put<{ database: BaseDatos }>(`/admin/bases-datos/${id}`, data);
  return response.data.database;
}

export async function deleteDatabase(id: number): Promise<void> {
  await api.delete(`/admin/bases-datos/${id}`);
}

export async function assignUserToDatabase(userId: number, databaseId: number, rol: "admin" | "user"): Promise<void> {
  await api.post("/admin/usuarios-bases-datos", { userId, databaseId, rol });
}

export async function removeUserFromDatabase(userId: number, databaseId: number): Promise<void> {
  await api.delete("/admin/usuarios-bases-datos", { data: { userId, databaseId } });
}

export async function listAllUsers(): Promise<Usuario[]> {
  const response = await api.get<{ users: Usuario[] }>("/admin/usuarios");
  return response.data.users;
}

export async function getGlobalConfig(): Promise<ConfiguracionGlobal[]> {
  const response = await api.get<{ config: ConfiguracionGlobal[] }>("/admin/configuracion-global");
  return response.data.config;
}

export async function updateGlobalConfig(clave: string, valor: string): Promise<ConfiguracionGlobal> {
  const response = await api.put<{ config: ConfiguracionGlobal }>(`/admin/configuracion-global/${clave}`, { valor });
  return response.data.config;
}

// Helper para verificar permisos
export function hasPermission(
  permisos: MenuPermission[],
  menuCode: string,
  action: "ver" | "crear" | "editar" | "eliminar"
): boolean {
  const permiso = permisos.find((p) => p.codigo === menuCode);
  if (!permiso) return false;

  switch (action) {
    case "ver":
      return permiso.puedeVer;
    case "crear":
      return permiso.puedeCrear;
    case "editar":
      return permiso.puedeEditar;
    case "eliminar":
      return permiso.puedeEliminar;
    default:
      return false;
  }
}

// Helper para verificar rol
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  if (userRole === "master") return true;
  return requiredRoles.includes(userRole);
}
