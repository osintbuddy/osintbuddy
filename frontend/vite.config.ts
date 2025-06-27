import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
// import markdoc from 'unplugin-markdoc/vite'
// import nodes from './markdoc/nodes';
// import tags from './markdoc/tags';
import { plugin, Mode } from 'vite-plugin-markdown'
// nodes, tags markdoc({ nodes, tags })
// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), plugin({ mode: [Mode.MARKDOWN] }), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url))
      }
    ]
  }
})
