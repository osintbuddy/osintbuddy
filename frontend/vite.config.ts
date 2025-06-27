import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import dynamicImport from 'vite-plugin-dynamic-import'
import { plugin as mdPlugin, Mode } from 'vite-plugin-markdown'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), dynamicImport(), mdPlugin({ mode: [Mode.MARKDOWN] }), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url))
      }
    ]
  }
})
