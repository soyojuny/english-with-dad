import { test as base, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { listen, closeServer } from './next-server.mjs';
import { guardBrowser } from './network.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));

export const test = base.extend({
  clientServer: [async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'ewd-client-browser-'));
    let server;
    const unexpected = [];
    try {
      await build({
        stdin: {
          contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import ReadingManagerClient from '${root}/app/reading-manager-client.tsx'; createRoot(document.getElementById('root')).render(React.createElement(ReadingManagerClient,{ownerUserId:'owner-1',onSignOut:()=>{},isSigningOut:false}));`,
          resolveDir: root, loader: 'jsx',
        },
        outfile: join(directory, 'app.js'), bundle: true, platform: 'browser', jsx: 'automatic',
        define: { 'process.env.NODE_ENV': '"development"',
          'process.env.NEXT_PUBLIC_SUPABASE_URL': '"http://127.0.0.1:54321"',
          'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '"mock-publishable-key"' },
      });
      server = createServer(async (req, res) => {
        try {
          if (req.method !== 'GET') {
            unexpected.push(`${req.method} ${req.url}`); res.statusCode = 500; res.end('Unexpected client server method');
          } else if (req.url === '/app.js') {
            res.setHeader('Content-Type', 'application/javascript'); res.end(await readFile(join(directory, 'app.js')));
          } else if (req.url === '/styles.css') {
            res.setHeader('Content-Type', 'text/css'); res.end(await readFile(join(root, 'styles.css')));
          } else if (req.url === '/') {
            res.setHeader('Content-Type', 'text/html');
            res.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script src="/app.js"></script></html>');
          } else {
            unexpected.push(`${req.method} ${req.url}`); res.statusCode = 500; res.end('Unexpected client server request');
          }
        } catch (error) { unexpected.push(error.message); res.statusCode = 500; res.end(error.message); }
      });
      const origin = await listen(server);
      await use({ origin, unexpected });
    } finally {
      try { if (server?.listening) await closeServer(server); }
      finally { await rm(directory, {recursive:true, force:true}); }
    }
  }, { scope: 'worker' }],
  audio: async ({ context, page, clientServer }, use, testInfo) => {
    const guard = await guardBrowser(context, [clientServer.origin, 'http://127.0.0.1:54321']);
    let fixture;
    try {
      fixture = await audioFixture(context, page, clientServer.origin, guard);
      await use(fixture);
      guard.verify();
      expect(clientServer.unexpected, 'Unexpected client server request').toEqual([]);
    } catch (error) {
      // Teardown failures happen after Playwright's normal test-body screenshot hook.
      if (!page.isClosed()) await page.screenshot({ path: testInfo.outputPath('fixture-failed.png'), fullPage: true });
      throw error;
    } finally {
      fixture?.release();
      await mkdir(testInfo.outputDir, { recursive: true });
      const requestsPath = testInfo.outputPath('requests.json');
      await writeFile(requestsPath, JSON.stringify(guard.requests, null, 2));
      await testInfo.attach('requests', { path: requestsPath, contentType: 'application/json' });
    }
  },
});
export { expect };

async function audioFixture(context, page, origin, guard) {
  const now = new Date('2026-10-14T03:00:00Z');
  await page.clock.install({ time: now });
  const date = '2026-10-14'; // Asia/Seoul, independent of the Node host's TZ.
  const openedAt = new Date(now.getTime() - 5 * 60000).toISOString();
  const launches = [{owner_user_id:'owner-1', assignment_id:'assignment-2',task_type:'listen',opened_at:openedAt,returned_at:null}];
  const completions = [];
  let writes = 0;
  let held = false;
  let fail = false;
  let loseResponse = false;
  let heldCheck = false;
  let releaseCheck;
  let release;
  let heldAudio = false;
  let releaseAudio;
  function matches(row, query) {
    return [...query].filter(([k]) => !['select','order','on_conflict'].includes(k)).every(([k,v]) => {
      if (v.startsWith('eq.')) return String(row[k]) === v.slice(3);
      if (v === 'is.null') return row[k] == null;
      return true;
    });
  }
  await page.route('http://127.0.0.1:54321/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').at(-1);
    const methods = {children:['GET'],assignments:['GET'],completions:['GET','POST','PATCH'],audio_launches:['GET','POST','PATCH']};
    if (!methods[table]?.includes(request.method()) || url.pathname !== `/rest/v1/${table}`) {
      guard.unexpected.push(`${request.method()} ${request.url()}`);
      return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Unexpected client fixture request'})});
    }
    const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
    let data;
    const body = request.postDataJSON();
    const object = (request.headers()['accept'] || '').includes('vnd.pgrst.object');
    if (table === 'children') data = [{id:'child-1',owner_user_id:'owner-1',name:'테스트 아동',level:'1',goal:'오늘 읽기'}];
    else if (table === 'assignments') data = [1,2].map(i => ({id:`assignment-${i}`, owner_user_id:'owner-1',child_id:'child-1',date,book_id:`book-${i}`,activity_category:'focusListen',tasks:['listen'],task_counts:{listen:2},quiz_enabled:false,quiz_score:null,book:{id:`book-${i}`,owner_user_id:'owner-1',active:true,content_type:'book',series:'테스트',title:`테스트 책 ${i}`,volume:'',level:'',cover:'',audio_listen:'https://example.com/audio',audio_shadow:'',note:''},completions:completions.filter(x=>x.assignment_id===`assignment-${i}`),audioLaunches:launches.filter(x=>x.assignment_id===`assignment-${i}`)}));
    else if (table === 'completions') {
      if (request.method() !== 'GET') {
        writes++;
        if (held) await new Promise(resolve => { release = resolve; });
        if (fail) return route.fulfill({status:503,headers,body:JSON.stringify({message:'테스트 저장 실패',code:'TEST_NETWORK'})});
        if (request.method() === 'PATCH') {
          data = completions.filter(row => matches(row,url.searchParams));
          data.forEach(row=>Object.assign(row,body));
        } else {
          const current = completions.find(row => row.assignment_id === body.assignment_id && row.task_type === body.task_type);
          if (current && !request.headers()['prefer']?.includes('resolution=merge-duplicates')) return route.fulfill({status:409,headers,body:JSON.stringify({message:'duplicate',code:'23505'})});
          if (current) {Object.assign(current,body);data=[current];} else { completions.push(body);data=[body]; }
        }
        if (loseResponse) {
          loseResponse = false;
          return route.fulfill({status:503,headers,body:JSON.stringify({message:'저장 후 응답 유실',code:'TEST_NETWORK'})});
        }
      } else {
        if (heldCheck) await new Promise(resolve => { releaseCheck = resolve; });
        data = completions.filter(row => matches(row,url.searchParams));
      }
    } else if (table === 'audio_launches') {
      data = launches.filter(row=>matches(row,url.searchParams));
      if (request.method()==='PATCH') {
        data.forEach(row=>Object.assign(row,body));
      }
      else if (request.method()==='POST') { const row = launches.find(x=>x.assignment_id===body.assignment_id&&x.task_type===body.task_type); if(row) Object.assign(row,body); else launches.push(body); data=[row||body]; }
      if (heldAudio && request.method() !== 'GET' && body?.returned_at) await new Promise(resolve=>{releaseAudio=resolve;});
    } else {
      guard.unexpected.push(`${request.method()} ${request.url()}`);
      return route.fulfill({status:500,headers,body:JSON.stringify({message:'Unexpected client fixture request'})});
    }
    await route.fulfill({status:200,headers,body:JSON.stringify(object ? (data[0] || null) : data)});
  });
  await page.goto(origin);
  await page.locator('.profile-grid').getByRole('button', {name:/테스트 아동/}).click();
  await page.locator('.assignment-card').filter({hasText:'테스트 책 2'}).click();
  await page.getByRole('button',{name:'1회 완료',exact:true}).waitFor();
  await page.clock.pauseAt(new Date('2026-10-14T03:01:00Z'));
  return {context,page,completions,get writes(){return writes;},get audioReturnPending(){return Boolean(releaseAudio);},hold(){held=true;},holdAudio(){heldAudio=true;},holdCheck(){heldCheck=true;},release(){held=false;heldAudio=false;heldCheck=false;release?.();releaseAudio?.();releaseCheck?.();},fail(){fail=true;},recover(){fail=false;},loseResponse(){loseResponse=true;}};
}
