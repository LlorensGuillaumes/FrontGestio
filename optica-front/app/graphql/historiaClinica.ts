// ~/graphql/historiaClinica.ts

export const Q_HISTORIA_CLINICA = `#graphql
  query HistoriaClinica($idCliente: ID!) {
    historiaClinica(idCliente: $idCliente) {
      idCliente

      alergias {
        id
        sustancia
        reaccion
        activo
      }

      medicacion {
        id
        medicamento
        dosisFrecuencia
        fechaInicio
        fechaFin
        activo
      }

      antecedentes {
        id
        tipo
        descripcion
        fechaInicio
        fechaFin
        activo
      }

      habitos {
        id
        fumador
        observaciones
        activo
      }
    }
  }
`;
