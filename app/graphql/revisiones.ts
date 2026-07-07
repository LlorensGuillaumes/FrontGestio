export const Q_REVISION = `#graphql
  query Revision($id: ID!) {
    revision(id: $id) {
      id
      idCliente
      fecha
      profesional
      motivoConsulta
      sintomas
      observaciones

      agudezaVisual {
        id
        distancia
        odSin
        oiSin
        binSin
        odCon
        oiCon
        binCon
      }

      refraccionObjetiva {
        id
        metodo
        odEsf
        odCil
        odEje
        oiEsf
        oiCil
        oiEje
      }

      refraccionFinal {
        id
        odEsf
        odCil
        odEje
        odAdd
        oiEsf
        oiCil
        oiEje
        oiAdd
        prismaOd
        baseOd
        prismaOi
        baseOi
      }

      binocular {
        id
        coverLejos
        coverCerca
        convergencia
        vergencias
        estereopsis
        observaciones
      }

      motilidadPupilas {
        id
        motilidad
        pupilas
        observaciones
      }

      saludOcular {
        id
        biomicroscopia
        fondoOjo
        iopOd
        iopOi
        iopMetodo
        campoVisual
        observaciones
      }

      queratometriaTopografia {
        id
        odK1
        odK2
        odEje
        oiK1
        oiK2
        oiEje
        observaciones
      }

      historiaClinica {
        idCliente
        antecedentes { id tipo descripcion fechaInicio fechaFin activo }
        medicacion { id medicamento dosisFrecuencia fechaInicio fechaFin activo }
        alergias { id sustancia reaccion activo }
        habitos { id fumador observaciones activo }
      }
    }
  }
`;

export const M_REVISION_CREATE = `#graphql
  mutation RevisionCreate($input: RevisionCreateInput!) {
    revisionCreate(input: $input) {
      id
      idCliente
      fecha
      profesional
    }
  }
`;

export const M_REVISION_UPDATE = `#graphql
  mutation RevisionUpdate($id: ID!, $input: RevisionUpdateInput!) {
    revisionUpdate(id: $id, input: $input) {
      id
      idCliente
      fecha
      profesional
    }
  }
`;
