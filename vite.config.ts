// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// ELIMINA ESTAS LÍNEAS
// import tailwindcss from '@tailwindcss/postcss';
// import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  
  // ELIMINA ESTE BLOQUE COMPLETO
  /* css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  }, */

  // ELIMINA ESTE BLOQUE COMPLETO
  /* build: {
    rollupOptions: {
      output: {
        assetFileNames: `assets/[name].[hash].css`,
      },
    },
  }, */
  
});
