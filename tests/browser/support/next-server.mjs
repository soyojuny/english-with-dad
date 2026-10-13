import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../../../', import.meta.url));
export const ownerId = '11111111-1111-4111-8111-111111111111';

export async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

export async function closeServer(server) {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

export async function authServer() {
  const requests = [];
  const unexpected = [];
  const user = { id: ownerId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid',
    app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {}, identities: [],
    created_at: '2026-10-13T00:00:00Z', is_anonymous: false };
  const server = createServer((req, res) => {
    requests.push({ method: req.method, url: req.url, browser: Boolean(req.headers.origin), authorized: Boolean(req.headers.authorization) });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,x-client-info,content-type');
    if (req.method === 'OPTIONS') return res.end();
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/auth/v1/user' && req.headers.authorization?.startsWith('Bearer ')) {
      return res.end(JSON.stringify(user));
    }
    if (req.method === 'GET' && path === '/rest/v1/children') return res.end('[]');
    unexpected.push({ method: req.method, url: req.url });
    res.statusCode = 500;
    res.end(JSON.stringify({ message: `Unexpected Auth fixture request: ${req.method} ${req.url}` }));
  });
  const origin = await listen(server);
  return {
    origin, requests, unexpected,
    sessionCookie(nextOrigin) {
      const now = Math.floor(Date.now() / 1000);
      const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: ownerId, aud: 'authenticated', role: 'authenticated', exp: now + 3600, iat: now })).toString('base64url')}.fixture-signature`;
      const session = { access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user };
      return { name: `sb-${new URL(origin).hostname.split('.')[0]}-auth-token`,
        value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`, url: nextOrigin, sameSite: 'Lax' };
    },
    close: () => closeServer(server),
  };
}

export async function startNextServer(authOrigin, artifactDirectory, requestedPort) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(authOrigin)) throw new Error('Auth fixture must use loopback');
  await mkdir(artifactDirectory, { recursive: true });
  const temporaryRoot = process.env.TMPDIR || join(root, 'verification-artifacts/tmp');
  await mkdir(temporaryRoot, { recursive: true });
  const directory = await mkdtemp(join(temporaryRoot, 'ewd-next-browser-'));
  let child;
  let closed;
  let spawnError;
  let stopped = false;
  const log = join(artifactDirectory, 'next-server.log');
  const networkLog = join(artifactDirectory, 'next-network.log');
  await writeFile(networkLog, '');
  async function stop() {
    if (stopped) return;
    stopped = true;
    if (child?.pid && child.exitCode === null && child.signalCode === null) {
      try { process.kill(-child.pid, 'SIGTERM'); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
      const timer = setTimeout(() => {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ }
      }, 5_000);
      timer.unref();
      await closed;
      clearTimeout(timer);
    }
    await rm(directory, { recursive: true, force: true });
    await writeFile(join(artifactDirectory, 'cleanup.json'), JSON.stringify({ temporaryDirectoryRemoved: true, processExited: !child?.pid || child.exitCode !== null || child.signalCode !== null }));
  }
  try {
    // A copy excludes .env.local and gives Next its own .next and tsconfig writes.
    for (const path of ['app', 'lib', 'public', 'middleware.ts', 'styles.css', 'package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts']) {
      await cp(join(root, path), join(directory, path), { recursive: true });
    }
    const { symlink } = await import('node:fs/promises');
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'junction');
    let port = requestedPort;
    if (!port) {
      const reservation = createServer();
      const address = await listen(reservation);
      port = Number(new URL(address).port);
      await closeServer(reservation);
    }
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', directory, '--hostname', '127.0.0.1', '--port', String(port)], {
      detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_SUPABASE_URL: authOrigin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key',
        NEXT_PUBLIC_ENABLE_LOCAL_TEST_LOGIN: 'false', EWD_AUTH_FIXTURE_ORIGIN: authOrigin, EWD_NEXT_NETWORK_LOG: networkLog,
        NODE_OPTIONS: `--require=${join(root, 'tests/browser/support/next-network-guard.cjs')}` },
    });
    child.stdout.on('data', chunk => appendFileSync(log, chunk));
    child.stderr.on('data', chunk => appendFileSync(log, chunk));
    closed = once(child, 'close').catch(error => { spawnError = error; });
    // Do not request the page until Next reports readiness, so SSR is tested once.
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (spawnError) throw new Error(`Next startup failed: ${spawnError.message}; ${log}`);
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Next startup failed: exit ${child.exitCode}; ${log}`);
      const output = await readFile(log, 'utf8').catch(() => '');
      if (/Ready in/.test(output)) return { origin, close: stop, networkLog, log };
      await delay(100);
    }
    throw new Error(`Next startup timed out; ${log}`);
  } catch (error) {
    await stop();
    throw error;
  }
}
