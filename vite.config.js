// La configuración de Vite. Solo hace falta para «npm run build»: genera dist/ con nombres
// fijos (iksystem.js, con p5.js dentro, e iksystem.css), sin códigos de versión en el
// nombre. Así la web de VERTIK (vertik.net/iksystem) los copia y los carga siempre igual.
import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: dist/ funciona sirviéndolo desde cualquier carpeta.
  base: './',
  build: {
    // p5.js va dentro: que Vite no avise del tamaño.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        entryFileNames: 'iksystem.js',
        chunkFileNames: 'iksystem-[name].js',
        assetFileNames: 'iksystem[extname]',
      },
    },
  },
});
