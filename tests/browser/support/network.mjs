import { expect } from '@playwright/test';

export async function guardBrowser(context, allowedOrigins) {
  const requests = [];
  const unexpected = [];
  const errors = [];
  context.on('request', request => requests.push({ method: request.method(), url: request.url() }));
  context.on('requestfailed', request => requests.push({ url: request.url(), failure: request.failure()?.errorText }));
  const watchPage = page => page.on('pageerror', error => errors.push(error.message));
  context.pages().forEach(watchPage);
  context.on('page', watchPage);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (allowedOrigins.includes(url.origin)) return route.fallback();
    unexpected.push(route.request().url());
    await route.abort('blockedbyclient');
  });
  return {
    requests, unexpected, errors,
    verify() {
      expect(unexpected, 'Unexpected browser request').toEqual([]);
      expect(errors, 'Unexpected browser runtime error').toEqual([]);
    },
  };
}
