import { gql } from "@apollo/client";

export const GET_FACTURAS = gql`
  query GetFacturasFiltrado(
    $pagina: Int = 1
    $porPagina: Int = 20
    $serie: String
    $numero: Int
    $cifCliente: String
    $cliente: String
    $estadoFiscal: EstadoFiscal
    $estadoCobro: EstadoCobro
    $desdeFecha: DateTime
    $hastaFecha: DateTime
  ) {
    facturasVentaFiltrado(
      pagina: $pagina
      porPagina: $porPagina
      serie: $serie
      numero: $numero
      cifCliente: $cifCliente
      cliente: $cliente
      estadoFiscal: $estadoFiscal
      estadoCobro: $estadoCobro
      desdeFecha: $desdeFecha
      hastaFecha: $hastaFecha
    ) {
      facturas {
        id
        fechaFactura
        serie
        numero
        nombreCliente
        totalBaseImponible
        totalCuotaIva
        totalFactura
        estadoFiscal
        estadoCobro
        FacturaVentaLineas {
          id
          numeroLinea
          codigoItem
          descripcionItem
          cantidad
          precioUnitario
          baseImporte
          pcIva
          importeIva
          pcDescuento
          importeDescuento
          importeLinea
        }
      }
      totalRegistros
      totalPaginas
      paginaActual
    }
  }
`;
