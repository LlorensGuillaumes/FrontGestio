import { type RouteConfig, route, layout, index } from "@react-router/dev/routes";

export default [
  // ===============================
  // RUTAS PUBLICAS (sin layout)
  // ===============================
  route("login", "routes/login.tsx"),

  // Ruta raíz - redirige a login o home según autenticación
  index("routes/index.tsx"),

  // ===============================
  // RUTAS PROTEGIDAS (con DashboardLayout)
  // ===============================
  layout("layouts/DashboardLayout.tsx", [
    // ===============================
    // HOME
    // ===============================
    route("home", "routes/home.tsx"),

    // ===============================
    // PRODUCTOS
    // ===============================
    route("productos", "routes/productos/layout.tsx", [
      index("routes/productos/listado.tsx"),
      route("nuevo", "routes/productos/detalleProducto.tsx", { id: "productos-nuevo" }),
      route(":id", "routes/productos/detalleProducto.tsx", { id: "productos-detalle" }),
    ]),

    // STOCK DE PRODUCTOS
    route("productos/stock", "routes/productos/stock/layout.tsx", [
      index("routes/productos/stock/listado.tsx"),
    ]),

    // ===============================
    // FAMILIAS Y SUBFAMILIAS
    // ===============================
    route("productos/familias", "routes/productos/familias/layout.tsx", [
      index("routes/productos/familias/listado.tsx"),
      route("nuevo", "routes/productos/familias/detalleFamilia.tsx", { id: "familias-nuevo" }),
      route(":id", "routes/productos/familias/detalleFamilia.tsx", { id: "familias-detalle" }),
    ]),

    route("productos/familias/subFamilias", "routes/productos/familias/subFamilias/layout.tsx", [
      index("routes/productos/familias/subFamilias/listado.tsx"),
      route("nuevo", "routes/productos/familias/subFamilias/detalleSubFamilia.tsx", { id: "subfamilias-nuevo" }),
      route(":id", "routes/productos/familias/subFamilias/detalleSubFamilia.tsx", { id: "subfamilias-detalle" }),
    ]),

    // ===============================
    // CLIENTES
    // ===============================
    route("clientes", "routes/clientes/layout.tsx", [
      index("routes/clientes/listado.tsx"),
      route("nuevo", "routes/clientes/detalleCliente.tsx", { id: "clientes-nuevo" }),
      route(":id", "routes/clientes/detalleCliente.tsx", { id: "clientes-detalle" }),
    ]),

    // ===============================
    // PROVEEDORES
    // ===============================
    route("proveedores", "routes/proveedores/layout.tsx", [
      index("routes/proveedores/listado.tsx"),
      route("nuevo", "routes/proveedores/detalleProveedor.tsx", { id: "proveedores-nuevo" }),
      route(":id", "routes/proveedores/detalleProveedor.tsx", { id: "proveedores-detalle" }),
    ]),

    // ==============================
    // CONTABILIDAD
    // ==============================

    // VENTAS: /contabilidad/ventas
    route("contabilidad/ventas", "routes/contabilidad/ventas/layout.tsx", [
      index("routes/contabilidad/ventas/listado.tsx"),
    ]),

    // CAJA: /contabilidad/caja
    route("contabilidad/caja", "routes/contabilidad/caja/layout.tsx", [
      index("routes/contabilidad/caja/listado.tsx"),
    ]),

    // ==============================
    // COMPRAS (Ordenes, Recepciones, Facturas)
    // ==============================
    route("compras", "routes/compras/layout.tsx", [
      index("routes/compras/ordenes/listado.tsx", { id: "compras-index" }),
      route("ordenes", "routes/compras/ordenes/listado.tsx", { id: "compras-ordenes" }),
      route("recepciones", "routes/compras/recepciones/listado.tsx", { id: "compras-recepciones" }),
      route("facturas", "routes/compras/facturas/listado.tsx", { id: "compras-facturas" }),
    ]),

    // ===============================
    // CONFIGURACION / MANTENIMIENTOS
    // ===============================
    route("configuracion/profesionales", "routes/configuracion/profesionales/layout.tsx", [
      index("routes/configuracion/profesionales/listado.tsx"),
    ]),

    route("configuracion/servicios", "routes/configuracion/servicios/layout.tsx", [
      index("routes/configuracion/servicios/listado.tsx"),
    ]),

    route("configuracion/modos-pago", "routes/configuracion/modos-pago/layout.tsx", [
      index("routes/configuracion/modos-pago/listado.tsx"),
    ]),

    route("configuracion/empresa", "routes/configuracion/empresa.tsx", { id: "configuracion-empresa" }),

    route("configuracion/aeat", "routes/configuracion/aeat/index.tsx", { id: "configuracion-aeat" }),

    // ===============================
    // GESTION DE USUARIOS (Admin/Master)
    // ===============================
    route("configuracion/usuarios", "routes/configuracion/usuarios/layout.tsx", [
      index("routes/configuracion/usuarios/listado.tsx"),
    ]),

    // ===============================
    // GESTION DE BASES DE DATOS (Solo Master)
    // ===============================
    route("configuracion/bases-datos", "routes/configuracion/bases-datos.tsx", { id: "configuracion-bases-datos" }),

    // ===============================
    // PERFIL DE USUARIO
    // ===============================
    route("perfil", "routes/perfil.tsx", { id: "perfil" }),

    // ===============================
    // COMUNICACION (Notificaciones, Mensajes, Chat)
    // ===============================
    route("comunicacion", "routes/comunicacion/layout.tsx", [
      index("routes/comunicacion/index.tsx"),
      route("notificaciones", "routes/comunicacion/notificaciones.tsx", { id: "comunicacion-notificaciones" }),
      route("mensajes", "routes/comunicacion/mensajes/index.tsx", { id: "comunicacion-mensajes" }),
      route("mensajes/nuevo", "routes/comunicacion/mensajes/nuevo.tsx", { id: "comunicacion-mensajes-nuevo" }),
      route("chat", "routes/comunicacion/chat.tsx", { id: "comunicacion-chat" }),
    ]),

    // ===============================
    // AGENDA
    // ===============================
    route("agenda", "routes/agenda/layout.tsx", [
      index("routes/agenda/calendario.tsx"),
    ]),

    // ===============================
    // RECURSOS HUMANOS (RRHH)
    // ===============================
    route("rrhh", "routes/rrhh/layout.tsx", [
      // Trabajadores
      route("trabajadores", "routes/rrhh/trabajadores/layout.tsx", [
        index("routes/rrhh/trabajadores/listado.tsx"),
        route(":id/horario", "routes/rrhh/trabajadores/$id.horario.tsx", { id: "trabajador-horario" }),
        route(":id/ausencias", "routes/rrhh/trabajadores/$id.ausencias.tsx", { id: "trabajador-ausencias" }),
      ]),

      // Festivos
      route("festivos", "routes/rrhh/festivos/layout.tsx", [
        index("routes/rrhh/festivos/listado.tsx"),
      ]),

      // Convenios
      route("convenios", "routes/rrhh/convenios/layout.tsx", [
        index("routes/rrhh/convenios/listado.tsx"),
      ]),

      // Fichajes
      route("fichajes", "routes/rrhh/fichajes/layout.tsx", [
        index("routes/rrhh/fichajes/index.tsx"),
        route("resumen", "routes/rrhh/fichajes/resumen.tsx", { id: "fichajes-resumen" }),
      ]),

      // Control Horario
      route("control-horario", "routes/rrhh/control-horario/layout.tsx", [
        route("resumen", "routes/rrhh/control-horario/resumen.tsx", { id: "control-horario-resumen" }),
        route("calendario", "routes/rrhh/control-horario/calendario.tsx", { id: "control-horario-calendario" }),
      ]),
    ]),

  ]),
] satisfies RouteConfig;
