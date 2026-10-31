import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Resolve trusted, local components at build time; the browser receives one page.
export default defineConfig({
  plugins: [
    {
      name: 'local-html-components',
      transformIndexHtml: {
        order: 'pre',
        handler(html, context) {
          return html.replace(/<!-- component:([a-z-]+) -->/g, (_, name) => {
            const path = fileURLToPath(
              new URL(`./src/components/${name}.html`, import.meta.url),
            );
            context.server?.watcher.add(path);
            return readFileSync(path, 'utf8');
          });
        },
      },
      handleHotUpdate({ file, server }) {
        if (file.endsWith('.html') && file.includes('/src/components/')) {
          server.ws.send({ type: 'full-reload' });
          return [];
        }
      },
    },
  ],
});
