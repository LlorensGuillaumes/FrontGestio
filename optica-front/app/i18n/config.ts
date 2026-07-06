import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Traducciones ES
import commonES from "./locales/es/common.json";
import menuES from "./locales/es/menu.json";
import clientesES from "./locales/es/clientes.json";
import productosES from "./locales/es/productos.json";
import proveedoresES from "./locales/es/proveedores.json";
import comprasES from "./locales/es/compras.json";
import ventasES from "./locales/es/ventas.json";
import contabilidadES from "./locales/es/contabilidad.json";
import configuracionES from "./locales/es/configuracion.json";
import authES from "./locales/es/auth.json";
import usersES from "./locales/es/users.json";
import profileES from "./locales/es/profile.json";
import trabajadoresES from "./locales/es/trabajadores.json";
import controlHorarioES from "./locales/es/controlHorario.json";
import agendaES from "./locales/es/agenda.json";
import fichajesES from "./locales/es/fichajes.json";
import comunicacionES from "./locales/es/comunicacion.json";
import escolaES from "./locales/es/escola.json";

// Traducciones CA
import commonCA from "./locales/ca/common.json";
import menuCA from "./locales/ca/menu.json";
import clientesCA from "./locales/ca/clientes.json";
import productosCA from "./locales/ca/productos.json";
import proveedoresCA from "./locales/ca/proveedores.json";
import comprasCA from "./locales/ca/compras.json";
import ventasCA from "./locales/ca/ventas.json";
import contabilidadCA from "./locales/ca/contabilidad.json";
import configuracionCA from "./locales/ca/configuracion.json";
import authCA from "./locales/ca/auth.json";
import usersCA from "./locales/ca/users.json";
import profileCA from "./locales/ca/profile.json";
import trabajadoresCA from "./locales/ca/trabajadores.json";
import controlHorarioCA from "./locales/ca/controlHorario.json";
import agendaCA from "./locales/ca/agenda.json";
import fichajesCA from "./locales/ca/fichajes.json";
import comunicacionCA from "./locales/ca/comunicacion.json";
import escolaCA from "./locales/ca/escola.json";

const resources = {
  es: {
    common: commonES,
    menu: menuES,
    clientes: clientesES,
    productos: productosES,
    proveedores: proveedoresES,
    compras: comprasES,
    ventas: ventasES,
    contabilidad: contabilidadES,
    configuracion: configuracionES,
    auth: authES,
    users: usersES,
    profile: profileES,
    trabajadores: trabajadoresES,
    controlHorario: controlHorarioES,
    agenda: agendaES,
    fichajes: fichajesES,
    comunicacion: comunicacionES,
    escola: escolaES,
  },
  ca: {
    common: commonCA,
    menu: menuCA,
    clientes: clientesCA,
    productos: productosCA,
    proveedores: proveedoresCA,
    compras: comprasCA,
    ventas: ventasCA,
    contabilidad: contabilidadCA,
    configuracion: configuracionCA,
    auth: authCA,
    users: usersCA,
    profile: profileCA,
    trabajadores: trabajadoresCA,
    controlHorario: controlHorarioCA,
    agenda: agendaCA,
    fichajes: fichajesCA,
    comunicacion: comunicacionCA,
    escola: escolaCA,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es",
    defaultNS: "common",
    ns: [
      "common",
      "menu",
      "clientes",
      "productos",
      "proveedores",
      "compras",
      "ventas",
      "contabilidad",
      "configuracion",
      "auth",
      "users",
      "profile",
      "trabajadores",
      "controlHorario",
      "agenda",
      "fichajes",
      "comunicacion",
      "escola",
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
