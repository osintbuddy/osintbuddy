import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import dynamicImport from 'vite-plugin-dynamic-import'
import { plugin as mdPlugin, Mode } from 'vite-plugin-markdown'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
    dynamicImport(),
    mdPlugin({ mode: [Mode.MARKDOWN] }),
    tsconfigPaths(),
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
  },
  server: {
    port: 55173,
    host: true,
  },
})
