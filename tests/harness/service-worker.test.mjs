import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8');
const shell = ['/', '/manifest.webmanifest', '/assets/app-icon.svg', '/assets/app-icon-192.png',
  '/assets/app-icon-512.png', '/assets/covers/berenstain-doctor.jpg', '/assets/covers/bones.jpg',
  '/assets/covers/monthly-filled.jpg'];

function worker({ entries = [], keys = ['ewd-reading-v1'], failure, installFailure, openFailure } = {}) {
  const listeners = new Map();
  const cached = new Map(entries);
  const calls = { deleted: [], network: [], matches: [], added: [], opened: [], skipped: 0, claimed: 0 };
  runInNewContext(source, {
    self: { addEventListener: (type, handler) => listeners.set(type, handler),
      skipWaiting: () => { calls.skipped++; }, clients: { claim: () => { calls.claimed++; } } },
    caches: {
      open: async name => {
        calls.opened.push(name);
        if (openFailure) throw openFailure;
        return { addAll: async urls => {
          calls.added.push(...urls);
          if (installFailure) throw installFailure;
          urls.forEach(url => cached.set(url, `shell:${url}`));
        } };
      },
      keys: async () => keys,
      delete: async key => { calls.deleted.push(key); return true; },
      match: async request => {
        const key = typeof request === 'string' ? request : request.url;
        calls.matches.push(key);
        return cached.get(key);
      },
    },
    fetch: async request => {
      calls.network.push(request.url);
      if (failure) throw failure;
      return `network:${request.url}`;
    },
  });
  return {
    calls,
    dispatch(type, request) {
      let result;
      listeners.get(type)({ request, waitUntil: promise => { result = promise; },
        respondWith: promise => { result = promise; } });
      return result;
    },
  };
}

const get = (url, mode = 'cors') => ({ url, method: 'GET', mode });

test('P01-N01: install은 현재 app shell 전체를 준비하고 새 worker를 대기 없이 진행한다', async () => {
  // Given
  const sw = worker();
  // When
  await sw.dispatch('install');
  const response = await sw.dispatch('fetch', get('/assets/app-icon.svg'));
  // Then
  assert.deepEqual(sw.calls.opened, ['ewd-reading-v1']);
  assert.deepEqual(sw.calls.added, shell);
  assert.equal(sw.calls.skipped, 1);
  assert.equal(response, 'shell:/assets/app-icon.svg');
  assert.deepEqual(sw.calls.network, []);
});

test('P01-E01: activate는 이전 cache만 삭제하고 client를 인계한다', async () => {
  // Given
  const sw = worker({ keys: ['ewd-reading-v0', 'ewd-reading-v1', 'ewd-reading-older'] });
  // When
  await sw.dispatch('activate');
  // Then
  assert.deepEqual(sw.calls.deleted, ['ewd-reading-v0', 'ewd-reading-older']);
  assert.equal(sw.calls.claimed, 1);
});

test('P01-E02: 빈 cache 목록의 activate도 client를 인계한다', async () => {
  // Given
  const sw = worker({ keys: [] });
  // When
  await sw.dispatch('activate');
  // Then
  assert.deepEqual(sw.calls.deleted, []);
  assert.equal(sw.calls.claimed, 1);
});

test('P01-N02: 온라인 navigation은 캐시보다 최신 서버 문서를 우선한다', async () => {
  // Given
  const sw = worker({ entries: [['/', 'old root']] });
  // When
  const response = await sw.dispatch('fetch', get('/auth/error', 'navigate'));
  // Then
  assert.equal(response, 'network:/auth/error');
  assert.deepEqual(sw.calls.matches, []);
});

test('P01-E03: offline navigation은 요청 경로와 무관하게 준비된 root 문서를 반환한다', async () => {
  // Given
  const sw = worker({ entries: [['/', 'root shell']], failure: new Error('offline') });
  // When
  const response = await sw.dispatch('fetch', get('/auth/error', 'navigate'));
  // Then
  assert.equal(response, 'root shell');
  assert.deepEqual(sw.calls.matches, ['/']);
});

test('P01-N03: 캐시 자산 GET은 offline에도 네트워크 없이 응답한다', async () => {
  // Given
  const sw = worker({ entries: [['/assets/app-icon.svg', 'icon']], failure: new Error('offline') });
  // When
  const response = await sw.dispatch('fetch', get('/assets/app-icon.svg'));
  // Then
  assert.equal(response, 'icon');
  assert.deepEqual(sw.calls.network, []);
});

test('P01-E04: cache miss GET은 네트워크 응답을 반환하며 동적 cache를 추가하지 않는다', async () => {
  // Given
  const sw = worker();
  // When
  const response = await sw.dispatch('fetch', get('/uncached.png'));
  // Then
  assert.equal(response, 'network:/uncached.png');
  assert.deepEqual(sw.calls.network, ['/uncached.png']);
  assert.deepEqual(sw.calls.added, []);
});

for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) {
  test(`P01-E05: ${method} 요청은 worker가 가로채지 않는다`, () => {
    // Given
    const sw = worker();
    // When
    const result = sw.dispatch('fetch', { url: '/write', method, mode: 'cors' });
    // Then
    assert.equal(result, undefined);
    assert.deepEqual(sw.calls.network, []);
    assert.deepEqual(sw.calls.matches, []);
  });
}

test('P01-F01: app shell 준비 실패는 install promise의 실패로 관찰된다', async () => {
  // Given
  const failure = new Error('cache addAll failed');
  const sw = worker({ installFailure: failure });
  // When
  const installation = sw.dispatch('install');
  // Then
  await assert.rejects(installation, error => error === failure);
});

test('P01-F02: 미캐시 자산의 network 실패를 성공 응답으로 숨기지 않는다', async () => {
  // Given
  const failure = new Error('offline asset');
  const sw = worker({ failure });
  // When
  const response = sw.dispatch('fetch', get('/uncached.png'));
  // Then
  await assert.rejects(response, error => error === failure);
});

test('P01-F03: cache open 실패도 install promise의 실패로 관찰된다', async () => {
  // Given
  const failure = new Error('cache open failed');
  const sw = worker({ openFailure: failure });
  // When
  const installation = sw.dispatch('install');
  // Then
  await assert.rejects(installation, error => error === failure);
  assert.deepEqual(sw.calls.added, []);
});

test('P01-E06: offline이며 root cache도 없으면 합성 성공 응답을 만들지 않는다', async () => {
  // Given: no successful install/cache population; offline app access is not guaranteed here.
  const sw = worker({ failure: new Error('offline without shell') });
  // When
  const response = await sw.dispatch('fetch', get('/auth/error', 'navigate'));
  // Then: undefined is not a valid Response; the browser cannot provide a fallback document.
  assert.equal(response, undefined);
  assert.deepEqual(sw.calls.matches, ['/']);
});
