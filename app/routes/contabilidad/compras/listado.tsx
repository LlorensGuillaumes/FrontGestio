// routes/contabilidad/compras/listado.tsx
import { useTranslation } from "react-i18next";

export default function ListadoCompras() {
  const { t } = useTranslation(["contabilidad"]);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t("comprasList.titulo")}</h1>
      <p className="text-slate-500">{t("comprasList.subtitulo")}</p>
    </div>
  );
}