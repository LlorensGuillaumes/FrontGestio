export const Q_CLIENTE = `#graphql
  query Cliente($id: ID!) {
    cliente(id: $id) {
      id
      tipoCliente
      documentoFiscal
      nombreComercial
      direccion
      codigoPostal
      poblacion
      pais
      esClienteFacturaSimplificada
      activo
      fechaAlta
      persona { nombre primerApellido segundoApellido fechaNacimiento }
      empresa { razonSocial nombreFiscal personaContacto emailContacto }
      telefonos { id telefono extension tipo esPrincipal activo }
      facturasVentaCount
      revisionesCount
      documentosCount
    }
  }
`;

export const M_CLIENTE_CREATE = `#graphql
  mutation ClienteCreate($input: ClienteCreateInput!) {
    clienteCreate(input: $input) {
      id
      tipoCliente
      documentoFiscal
      nombreComercial
      activo
      persona { nombre primerApellido segundoApellido }
      empresa { razonSocial }
      telefonos { telefono extension esPrincipal }
    }
  }
`;

// -------------------
// QUERIES SUBGRIDS
// -------------------
// ⚠️ Facturas y Documentos son placeholder si aún no están en tu back.
export const Q_CLIENTE_FACTURAS = `#graphql
  query ClienteFacturas($idCliente: ID!) {
    clienteFacturas(idCliente: $idCliente) {
      id
      fecha
      total
      estado
    }
  }
`;

export const Q_CLIENTE_REVISIONES_FULL = `#graphql
  query ClienteRevisionesFull($idCliente: ID!) {
    clienteRevisionesFull(idCliente: $idCliente) {
      id
      fecha
      profesional
      motivoConsulta
      observaciones
    }
  }
`;

export const Q_CLIENTE_DOCUMENTOS = `#graphql
  query ClienteDocumentos($idCliente: ID!) {
    clienteDocumentos(idCliente: $idCliente) {
      id
      fecha
      tipo
      total
      estado
    }
  }
`;

// -------------------
// LISTADO CLIENTES
// -------------------
export const Q_CLIENTES_PAGE = `#graphql
  query ClientesPage($input: ClientesPageInput!) {
    clientesPage(input: $input) {
      totalCount
      pageInfo { endCursor hasNextPage }
      edges {
        cursor
        node {
          id
          tipoCliente
          documentoFiscal
          nombreComercial
          direccion
          codigoPostal
          poblacion
          pais
          esClienteFacturaSimplificada
          activo
          fechaAlta

          persona { nombre primerApellido segundoApellido }
          empresa { razonSocial emailContacto }

          telefonos { id telefono extension tipo esPrincipal activo }

          facturasVentaCount
          revisionesCount
          documentosCount
        }
      }
    }
  }
`;