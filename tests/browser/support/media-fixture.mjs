import { test as base, expect } from '@playwright/test';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { listen, closeServer } from './next-server.mjs';
import { guardBrowser } from './network.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
export const test = base.extend({
  mediaServer: [async ({}, use) => {
    const bundle = await build({
      stdin: {
        contents: `export {compressCoverImage} from './lib/cover-image'; export {readQrValueFromSource} from './lib/qr-reader';`,
        resolveDir: root,
      },
      bundle: true, platform: 'browser', format: 'iife', globalName: 'media', write: false,
    });
    const unexpected = [];
    const server = createServer(async (req, res) => {
      try {
        if (req.method === 'GET' && req.url === '/') {
          res.setHeader('Content-Type', 'text/html');
          res.end('<!doctype html><html><link rel="icon" href="data:,"><script src="/media.js"></script></html>');
        } else if (req.method === 'GET' && req.url === '/media.js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(bundle.outputFiles[0].contents);
        } else if (req.method === 'GET' && ['/qr-url.png', '/qr-inverted.png', '/qr-text.png'].includes(req.url)) {
          res.setHeader('Content-Type', 'image/png');
          res.end(await readFile(`${root}/tests/browser/fixtures${req.url}`));
        } else {
          unexpected.push(`${req.method} ${req.url}`);
          res.writeHead(500).end('Unexpected media request');
        }
      } catch (error) {
        unexpected.push(error.message);
        res.writeHead(500).end(error.message);
      }
    });
    try { await use({ origin: await listen(server), unexpected }); }
    finally { await closeServer(server); }
  }, { scope: 'worker' }],
  media: async ({ context, page, mediaServer }, use, testInfo) => {
    const guard = await guardBrowser(context, [mediaServer.origin]);
    try {
      await page.goto(mediaServer.origin);
      await use(page);
      guard.verify();
      expect(mediaServer.unexpected).toEqual([]);
    } catch (error) {
      if (!page.isClosed()) await page.screenshot({ path: testInfo.outputPath('fixture-failed.png'), fullPage: true });
      throw error;
    } finally {
      await mkdir(testInfo.outputDir, { recursive: true });
      const path = testInfo.outputPath('requests.json');
      await writeFile(path, JSON.stringify(guard.requests, null, 2));
      await testInfo.attach('requests', { path, contentType: 'application/json' });
    }
  },
});
export { expect };
