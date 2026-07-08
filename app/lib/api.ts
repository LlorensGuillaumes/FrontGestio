// app/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://gestio-back.onrender.com/api",
  headers: { Accept: "application/json" },
});

// Request interceptor - añade token y base de datos
api.interceptors.request.use((config) => {
  // Solo acceder a localStorage en el navegador (no en SSR)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    const currentDatabase = localStorage.getItem("currentDatabase");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (currentDatabase) {
      config.headers["X-Database"] = currentDatabase;
    }
  }

  const m = (config.method || "get").toLowerCase();
  if (["post", "put", "patch"].includes(m)) {
    config.headers["Content-Type"] = "application/json";
  } else {
    delete (config.headers as Record<string, unknown>)["Content-Type"];
  }

  return config;
});

// Response interceptor - maneja errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";

      // No redirigir si es un intento de login (dejar que el componente maneje el error)
      const isLoginAttempt = requestUrl.includes("/auth/login");

      if (!isLoginAttempt && typeof window !== "undefined") {
        // Token invalido o expirado
        localStorage.removeItem("token");
        localStorage.removeItem("currentDatabase");

        // Solo redirigir si no estamos ya en login
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
