// app/lib/departamentosRest.ts
import { api } from "~/lib/api";

export type Departamento = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
};

export type UsuarioDepartamento = {
  idUsuario: number;
  username: string;
  nombre: string | null;
};

export type PermisoComunicacion = {
  idDepartamentoOrigen: number;
  nombreDepartamentoOrigen: string;
  idDepartamentoDestino: number;
  nombreDepartamentoDestino: string;
  puedeChat: boolean;
  puedeMensajeFormal: boolean;
};

export type UsuarioConDepartamentos = {
  id: number;
  username: string;
  nombre: string | null;
  departamentos: string[];
};

/**
 * Obtener todos los departamentos
 */
export async function fetchDepartamentos(soloActivos: boolean = true): Promise<Departamento[]> {
  const params = soloActivos ? "" : "?activos=0";
  const { data } = await api.get<{ data: Departamento[] }>(`/departamentos${params}`);
  return data.data;
}

/**
 * Obtener un departamento por ID
 */
export async function fetchDepartamento(id: number): Promise<Departamento> {
  const { data } = await api.get<{ data: Departamento }>(`/departamentos/${id}`);
  return data.data;
}

/**
 * Crear un nuevo departamento
 */
export async function crearDepartamento(nombre: string, descripcion?: string): Promise<Departamento> {
  const { data } = await api.post<{ data: Departamento }>("/departamentos", {
    nombre,
    descripcion,
  });
  return data.data;
}

/**
 * Actualizar un departamento
 */
export async function actualizarDepartamento(
  id: number,
  datos: { nombre?: string; descripcion?: string; activo?: boolean }
): Promise<void> {
  await api.put(`/departamentos/${id}`, datos);
}

/**
 * Eliminar (desactivar) un departamento
 */
export async function eliminarDepartamento(id: number): Promise<void> {
  await api.delete(`/departamentos/${id}`);
}

/**
 * Obtener usuarios de un departamento
 */
export async function fetchUsuariosDepartamento(idDepartamento: number): Promise<UsuarioDepartamento[]> {
  const { data } = await api.get<{ data: UsuarioDepartamento[] }>(
    `/departamentos/${idDepartamento}/usuarios`
  );
  return data.data;
}

/**
 * Asignar usuarios a un departamento
 */
export async function asignarUsuarios(idDepartamento: number, idUsuarios: number[]): Promise<void> {
  await api.put(`/departamentos/${idDepartamento}/usuarios`, { idUsuarios });
}

/**
 * Agregar un usuario a un departamento
 */
export async function agregarUsuario(idDepartamento: number, idUsuario: number): Promise<void> {
  await api.post(`/departamentos/${idDepartamento}/usuarios/${idUsuario}`);
}

/**
 * Quitar un usuario de un departamento
 */
export async function quitarUsuario(idDepartamento: number, idUsuario: number): Promise<void> {
  await api.delete(`/departamentos/${idDepartamento}/usuarios/${idUsuario}`);
}

/**
 * Obtener permisos de comunicación entre departamentos
 */
export async function fetchPermisosComunicacion(): Promise<PermisoComunicacion[]> {
  const { data } = await api.get<{ data: PermisoComunicacion[] }>("/departamentos/permisos");
  return data.data;
}

/**
 * Configurar permiso de comunicación entre departamentos
 */
export async function configurarPermiso(
  idDepartamentoOrigen: number,
  idDepartamentoDestino: number,
  puedeChat: boolean,
  puedeMensajeFormal: boolean
): Promise<void> {
  await api.put("/departamentos/permisos", {
    idDepartamentoOrigen,
    idDepartamentoDestino,
    puedeChat,
    puedeMensajeFormal,
  });
}

/**
 * Eliminar permiso de comunicación
 */
export async function eliminarPermiso(
  idDepartamentoOrigen: number,
  idDepartamentoDestino: number
): Promise<void> {
  await api.delete("/departamentos/permisos", {
    data: { idDepartamentoOrigen, idDepartamentoDestino },
  });
}

/**
 * Obtener todos los usuarios con sus departamentos
 */
export async function fetchUsuariosConDepartamentos(): Promise<UsuarioConDepartamentos[]> {
  const { data } = await api.get<{ data: UsuarioConDepartamentos[] }>("/departamentos/usuarios");
  return data.data;
}

/**
 * Obtener departamentos de un usuario
 */
export async function fetchDepartamentosUsuario(idUsuario: number): Promise<Departamento[]> {
  const { data } = await api.get<{ data: Departamento[] }>(`/departamentos/usuario/${idUsuario}`);
  return data.data;
}
