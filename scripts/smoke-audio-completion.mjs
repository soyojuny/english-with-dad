import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Preserve the existing command; Playwright discovers all client HTTP regressions.
const root = fileURLToPath(new URL('../', import.meta.url));
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url)), 'test', '--project=client-http'], {
  cwd: root, stdio: 'inherit', env: process.env,
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
