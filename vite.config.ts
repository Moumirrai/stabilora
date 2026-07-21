import { defineConfig, searchForWorkspaceRoot } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import fs from 'fs';

const arcoraPath = fs.existsSync('node_modules/@stabilora/arcora') 
  ? fs.realpathSync('node_modules/@stabilora/arcora') 
  : null;

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: { alias: { $lib: path.resolve('./src/lib') } },
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        ...(arcoraPath ? [arcoraPath] : [])
      ]
    }
  }
});