// app/root.tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "~/contexts/AuthContext";
import "./app.css";
import "./i18n/config";

function Document({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("ca") ? "ca" : "es";

  return (
    <html lang={currentLang} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Document>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </Document>
  );
}

export function HydrateFallback() {
  return (
    <Document>
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    </Document>
  );
}
