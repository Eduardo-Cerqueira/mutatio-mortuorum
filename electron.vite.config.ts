import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, swcPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      minify: 'esbuild',
      rollupOptions: {
        external: ['better-sqlite3'],
        output: {
          format: 'es'
        }
      }
    },
    plugins: [externalizeDepsPlugin(), swcPlugin()]
  },
  preload: {
    build: {
      minify: 'esbuild',
      rollupOptions: {
        output: {
          format: 'es'
        }
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      minify: 'esbuild',
      rollupOptions: {
        output: {
          format: 'es'
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
