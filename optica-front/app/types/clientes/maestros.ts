// src/types/maestros.ts
export type Familia = {
  id: number;
  descripcion: string; // o Descripcion, lo que toque en tu DB
};

export type Subfamilia = {
  id: number;
  id_familia: number;
  descripcion: string;
  prioridad: number;
  activa: boolean;
};

export type TipoCliente = "P" | "E";
export type Telefono = { telefono: string; extension?: string | null };

export type Cliente = {
  IdCliente: number;
  TipoCliente?: TipoCliente;

  DocumentoFiscal?: string;
  NombreComercial?: string | null;
  EsSimplificada?: boolean;

  P_Nombre?: string;
  P_Apellido1?: string;
  P_Apellido2?: string;
  P_FechaNac?: string;

  E_RazonSocial?: string;
  E_NombreFiscal?: string;
  E_Contacto?: string;
  E_Email?: string;

  Direccion?: string;
  CodigoPostal?: string;
  Poblacion?: string;
  Pais?: string;

  telefonos?: Telefono[];
};

export type ClienteSubfamiliaRow = {
  id?: number;
  id_cliente?: number;
  id_subfamilia: number;
  fecha_desde: string | null;
  fecha_hasta: string | null;
};

export type Props = {
  mode: ClienteModalMode;
  id?: string; // viene del layout (searchParams)
  onClose: () => void;
  onSaved?: (id: number) => void;
  onEdit: () => void;
  onView: () => void;
};

export type ClienteModalMode = "new" | "edit" | "view";