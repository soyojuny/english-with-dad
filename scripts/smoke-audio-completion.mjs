import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const toolsDir = process.env.EWD_BROWSER_TOOLS_DIR || '/tmp/ewd-audio-browser';
const { build } = await import(pathToFileURL(join(toolsDir, 'node_modules/esbuild/lib/main.js')));
const { chromium } = await import(pathToFileURL(join(toolsDir, 'node_modules/playwright/index.mjs')));
const root = process.cwd();
const output = await mkdtemp(join(tmpdir(), 'ewd-audio-smoke-'));
await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import ReadingManagerClient from '${root}/app/reading-manager-client.tsx'; createRoot(document.getElementById('root')).render(React.createElement(ReadingManagerClient,{ownerUserId:'owner-1',onSignOut:()=>{},isSigningOut:false}));`,
    resolveDir: root,
    loader: 'jsx',
  },
  outfile: output + '/app.js',
  bundle: true,
  platform: 'browser',
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.NEXT_PUBLIC_SUPABASE_URL': '"http://127.0.0.1:54321"',
    'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '"mock-publishable-key"',
  },
});
const server = createServer(async (req, res) => {
  if (req.url === '/app.js') {
    res.setHeader('Content-Type', 'application/javascript'); res.end(await readFile(output + '/app.js'));
  } else if (req.url === '/styles.css') {
    res.setHeader('Content-Type', 'text/css'); res.end(await readFile(root + '/styles.css'));
  } else if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html'); res.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="root"></div><script src="/app.js"></script></html>');
  } else { res.statusCode = 404; res.end('not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.EWD_CHROMIUM_PATH, args: ['--no-sandbox'] });
const results = [];
const runtimeErrors = [];

async function fixture() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', error => runtimeErrors.push(error.message));
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const openedAt = new Date(now.getTime() - 5 * 60000).toISOString();
  const launches = [{owner_user_id:'owner-1', assignment_id:'assignment-2',task_type:'listen',opened_at:openedAt,returned_at:null}];
  const completions = [];
  let writes = 0;
  let held = false;
  let fail = false;
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
      } else data = completions.filter(row => matches(row,url.searchParams));
    } else if (table === 'audio_launches') {
      data = launches.filter(row=>matches(row,url.searchParams));
      if (request.method()==='PATCH') {
        data.forEach(row=>Object.assign(row,body));
      }
      else if (request.method()==='POST') { const row = launches.find(x=>x.assignment_id===body.assignment_id&&x.task_type===body.task_type); if(row) Object.assign(row,body); else launches.push(body); data=[row||body]; }
      if (heldAudio && request.method() !== 'GET' && body?.returned_at) await new Promise(resolve=>{releaseAudio=resolve;});
    } else data = [];
    await route.fulfill({status:200,headers,body:JSON.stringify(object ? (data[0] || null) : data)});
  });
  await page.goto(origin);
  await page.locator('.profile-grid').getByRole('button', {name:/테스트 아동/}).click();
  await page.locator('.assignment-card').filter({hasText:'테스트 책 2'}).click();
  await page.getByRole('button',{name:'1회 완료',exact:true}).waitFor();
  return {context,page,completions,get writes(){return writes;},hold(){held=true;},holdAudio(){heldAudio=true;},release(){held=false;heldAudio=false;release?.();releaseAudio?.();},fail(){fail=true;},recover(){fail=false;}};
}
async function run(name, test) {
  const f = await fixture();
  try {await test(f);results.push({name,status:'passed'});} catch(error) {results.push({name,status:'failed',error:error.message});}
  finally {f.release();await f.page.screenshot({path:output+`/${name}.png`,fullPage:true});await f.context.close();}
}
try {
  await run('selection-reload',async f=>{
    await f.page.reload();
    await f.page.locator('.assignment-card.is-active').filter({hasText:'테스트 책 2'}).waitFor({timeout:4000});
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).waitFor({timeout:4000});
  });
  await run('saving-status',async f=>{
    f.hold();
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    await f.page.waitForTimeout(350);
    const buttons = f.page.locator('.return-box button');
    assert.equal(await buttons.first().isDisabled(),true,'completion remains clickable while saving');
    assert.match(await f.page.locator('.return-box').innerText(),/저장|확인/);
    assert.equal(f.writes,1);
    f.release();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
    assert.equal(f.completions[0].count,1);
  });
  await run('persistent-error',async f=>{
    f.fail();
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    await f.page.waitForTimeout(3200);
    assert.match(await f.page.locator('.return-box').innerText(),/실패|못했|확인|오류/,'failure disappears after toast');
    assert.equal(f.completions.length,0);
  });
  await run('return-before-save-response',async f=>{
    f.holdAudio();
    await f.page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));});
    await f.page.waitForTimeout(200);
    await f.page.getByRole('button',{name:'1회 완료',exact:true}).click();
    await f.page.getByRole('button',{name:'2회 완료',exact:true}).waitFor({timeout:4000});
    assert.ok(f.completions[0].minutes > 0 && f.completions[0].minutes < 10,'completion uses fallback while local return time is available');
  });
  assert.equal(runtimeErrors.length,0,JSON.stringify(runtimeErrors));
} finally {
  await writeFile(output + '/result.json',JSON.stringify({results,runtimeErrors},null,2));
  process.stdout.write(JSON.stringify({results,runtimeErrors,artifacts:output},null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
if(results.some(x=>x.status!=='passed')||runtimeErrors.length) process.exitCode=1;
