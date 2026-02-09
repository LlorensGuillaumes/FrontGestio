// postcss.config.js (Con sintaxis ES Module CORREGIDA)
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // ¡ESTE es el nombre correcto del plugin!
    'autoprefixer': {},
  },
};
