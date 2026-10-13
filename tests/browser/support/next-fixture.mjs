import { test as base, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { guardBrowser } from './network.mjs';
import { authServer, startNextServer } from './next-server.mjs';

export const test = base.extend({
  nextApp: async ({ context, page }, use, testInfo) => {
    const auth = await authServer();
    let next;
    let guard;
    try {
      next = await startNextServer(auth.origin, testInfo.outputPath('servers'));
      guard = await guardBrowser(context, [next.origin, auth.origin]);
      await use({ ...next, auth });
      guard.verify();
      expect(auth.unexpected, 'Unexpected Auth fixture request').toEqual([]);
      expect(await readFile(next.networkLog, 'utf8'), 'Unexpected Next fetch').toBe('');
    } catch (error) {
      if (!page.isClosed()) await page.screenshot({ path: testInfo.outputPath('fixture-failed.png'), fullPage: true });
      throw error;
    } finally {
      try {
        await mkdir(testInfo.outputDir, { recursive: true });
        const requestsPath = testInfo.outputPath('requests.json');
        await writeFile(requestsPath, JSON.stringify({ browser: guard?.requests, server: auth.requests, unexpected: auth.unexpected }, null, 2));
        await testInfo.attach('requests', { path: requestsPath, contentType: 'application/json' });
      } finally {
        try { await context.close(); } finally {
          try { await next?.close(); } finally { await auth.close(); }
        }
      }
    }
  },
});
export { expect };
