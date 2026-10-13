const { appendFileSync } = require('node:fs');

// Only the isolated Next child inherits this preload. Actual app HTTP uses fetch.
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  // Next dev's version notice is known harness traffic, answered locally.
  // No registry connection is made; every other non-fixture URL still fails.
  if (url.href === 'https://registry.npmjs.org/-/package/next/dist-tags') {
    return new Response(null, { status: 503 });
  }
  if (url.origin !== process.env.EWD_AUTH_FIXTURE_ORIGIN) {
    const message = `Unexpected Next fetch: ${url.href}`;
    appendFileSync(process.env.EWD_NEXT_NETWORK_LOG, `${message}\n`);
    throw new Error(message);
  }
  return originalFetch(input, init);
};
