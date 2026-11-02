/* Review-only simulation. No app data, network requests, or persistent storage. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const elements = { fire: { name: '불', row: 1 }, thunder: { name: '번개', row: 2 }, ice: { name: '얼음', row: 3 } };
  const eggs = ['별무늬', '물결무늬', '보석무늬'];
  const items = [
    { id: 'meadow', name: '햇살 숲', slot: 'background', free: true },
    { id: 'sunset', name: '노을 언덕', slot: 'background' },
    { id: 'night', name: '달빛 숲', slot: 'background' },
    { id: 'moss', name: '이끼 둥지', slot: 'nest', free: true },
    { id: 'crystal', name: '수정 둥지', slot: 'nest' },
    { id: 'stone', name: '고대의 둥지', slot: 'nest' },
    { id: 'none', name: '비워 두기', slot: 'prop', free: true },
    { id: 'flowers', name: '작은 들꽃', slot: 'prop', free: true },
    { id: 'gem', name: '소원 수정', slot: 'prop' },
    { id: 'lantern', name: '별빛 등불', slot: 'prop' },
    { id: 'flag', name: '용기의 깃발', slot: 'prop' },
    { id: 'mushroom', name: '동화 버섯', slot: 'prop' },
  ];
  const slots = { background: '배경', nest: '둥지', left: '왼쪽 장식', right: '오른쪽 장식' };
  const art = {
    none: '<path d="m22 22 36 36m0-36L22 58" stroke="#b7c0aa" stroke-width="3"/>',
    flowers: '<path d="M24 70V36m20 34V24m12 46V44" stroke="#73905c" stroke-width="4"/><g fill="#f6e9b7" stroke="#d4b85e" stroke-width="2"><path d="M24 21c15 0 18 15 0 18-18-3-15-18 0-18Z"/><path d="M44 9c15 0 18 15 0 18-18-3-15-18 0-18Z"/><path d="M56 30c15 0 18 15 0 18-18-3-15-18 0-18Z"/></g><path d="M24 58 12 48m32 5 14-8m-14-6L32 31" stroke="#78965b" stroke-width="4"/>',
    gem: '<path d="m19 50 6-27 17-13 18 20 1 28-21 13Z" fill="#bdafe7"/><path d="m42 10-9 33 7 28 9-30Z" fill="#ede1ff"/><path d="m19 50 14-7 7 28Z" fill="#8a7cbd"/><path d="m60 30-11 11-9 30 21-13Z" fill="#9b90cf"/><path d="m11 25 3-7 3 7-3 7m50-12 3-7 3 7-3 7" fill="#f1d99a"/>',
    lantern: '<path d="M39 70V14q0-9 9-9t9 9v7" fill="none" stroke="#786b55" stroke-width="4"/><path d="m47 24 10-7 10 7v23H47Z" fill="#f3d786" stroke="#af8d50" stroke-width="3"/><path d="m57 28 3 6 6 2-6 3-3 7-3-7-6-3 6-2Z" fill="#fff9d7"/><ellipse cx="39" cy="71" rx="14" ry="4" fill="#a4ad80"/>',
    flag: '<path d="M28 72V11" stroke="#806b53" stroke-width="4"/><path d="M30 13h35L55 28l10 14H30Z" fill="#c58d74"/><path d="m43 19 3 6 7 2-6 4-1 7-4-6-7-1 6-5Z" fill="#f9e4b1"/><circle cx="28" cy="10" r="4" fill="#d2b879"/>',
    mushroom: '<path d="m30 71 3-29h14l6 29Z" fill="#efdfbe"/><path d="M14 45q4-38 26-38t29 38Z" fill="#bf826b"/><g fill="#f7e9cf"><circle cx="31" cy="26" r="5"/><circle cx="51" cy="21" r="4"/><circle cx="57" cy="36" r="5"/><circle cx="24" cy="39" r="3"/></g><path d="M15 72h50" stroke="#a0b381" stroke-width="5"/>',
  };
  let state;
  let tab = 'decorate';
  let activeSlot = 'background';
  let preview = null;
  let candidate = null;
  let galleryElement = 'fire';
  let toastTimer;

  function dragon(egg = 0, days = 0, element = null) {
    return { egg, days, element, decor: { background: 'meadow', nest: 'moss', left: 'flowers', right: 'none' } };
  }
  function reset(days = 0) {
    state = {
      total: days, spent: 0, owned: items.filter((item) => item.free).map((item) => item.id),
      dragons: days ? [dragon(0, days, days > 6 ? galleryElement : null)] : [], viewed: 0,
      choosing: !days, today: { reading: 0, quiz: null, credited: false, rest: false }, check: false,
    };
    preview = null;
    candidate = null;
    render();
  }
  const current = () => state.dragons[state.viewed];
  const growing = () => state.dragons[state.dragons.length - 1];
  const credits = () => Math.floor(state.total / 3) - state.spent;
  const allCollected = () => items.every((item) => state.owned.includes(item.id));
  function cell(d) {
    if (!d || d.days === 0) return [d?.egg || 0, 0];
    if (!d.element) return [3, 0];
    return [d.days >= 30 ? 2 : d.days >= 18 ? 1 : 0, elements[d.element].row];
  }
  function spriteStyle(d) {
    const [column, row] = cell(d);
    // Adult silhouettes need a slightly wider window than the nominal atlas cell.
    if (column === 2 && row > 0) return `background-size:365.71% 400%;background-position:68.817% ${row * 100 / 3}%`;
    return `background-position:${column * 100 / 3}% ${row * 100 / 3}%`;
  }
  const sprite = (d) => `<div class="sprite" style="${spriteStyle(d)}" aria-hidden="true"></div>`;
  const svg = (id) => `<svg viewBox="0 0 80 80" aria-hidden="true">${art[id] || ''}</svg>`;
  const stage = (d) => !d || !d.days ? '알' : !d.element ? '아기 드래곤' : d.days >= 30 ? '성체 드래곤' : d.days >= 18 ? '청소년 드래곤' : '어린 드래곤';
  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
  }
  function celebrate(message) {
    toast(message);
    $('#main-dragon').classList.remove('celebrate');
    requestAnimationFrame(() => $('#main-dragon').classList.add('celebrate'));
  }
  function showTab(next, scroll = false) {
    tab = next;
    preview = null;
    render();
    if (scroll) $('.explore-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderWorld() {
    const d = current();
    const decor = { ...(d?.decor || dragon().decor) };
    if (preview) decor[activeSlot] = preview.id;
    $('#scene').className = `scene ${decor.background}`;
    $('#nest').className = `nest ${decor.nest}`;
    $('#prop-left').innerHTML = decor.left === 'none' ? '' : svg(decor.left);
    $('#prop-right').innerHTML = decor.right === 'none' ? '' : svg(decor.right);
    $('#main-dragon').style.cssText = spriteStyle(d);
    $('#main-dragon').setAttribute('aria-label', `${d?.element ? elements[d.element].name + ' ' : ''}${stage(d)}`);
    $('.dragon-position').className = `dragon-position ${!d || !d.days ? 'egg' : !d.element ? 'baby' : ''}`;
    $('#dragon-index').textContent = d ? `CHAPTER ${String(state.viewed + 1).padStart(2, '0')} / YOUR LITTLE WORLD` : 'OUR FIRST CHAPTER';
    $('#dragon-title').textContent = !d ? '작은 만남의 시작' : `${d.element ? elements[d.element].name + '의 ' : ''}${stage(d)}`;
    $('#stage-pill').textContent = !d ? '알 선택' : d.days >= 30 ? '육성 완료 ✦' : `${d.days}일 함께했어요`;
    $('#growth-label').textContent = !d ? '첫 알을 골라 주세요' : d.days >= 30 ? '함께 완성한 우리 이야기' : '이 드래곤과 쌓은 달성일';
    $('#growth-number').textContent = `${d?.days || 0} / 30일`;
    $('#growth-fill').style.width = `${(d?.days || 0) / 30 * 100}%`;
    $('#scene-caption').textContent = !d ? '어떤 알과 첫 이야기를 시작할까요?' : d.days === 0 ? '첫 하루 목표를 달성하면 만나게 될 거예요.' : d.days >= 30 ? '우리가 함께 읽은 날들이, 이렇게 멋진 날개가 됐어.' : d.days >= 6 && !d.element ? '내 안에 어떤 힘이 잠들어 있을까?' : d.days >= 18 ? '더 넓은 세상을 향해, 날개를 펼쳐요.' : '조금씩, 너와 함께 자라고 있어요.';
    $('#scene-preview').hidden = !preview;
  }

  function renderStory() {
    const d = current();
    const last = growing();
    let html;
    if (state.choosing) {
      html = `<span class="eyebrow">${last ? 'A NEW BEGINNING' : 'HELLO, LITTLE ONE'}</span><h3>${last ? '다음 친구를 만나볼까요?' : '처음 만날 알을 골라요'}</h3><p>무늬가 마음에 드는 알을 골라요.<br>어떤 알이든 세 속성으로 자랄 수 있어요.</p><div class="egg-options">${eggs.map((name, index) => `<button class="egg-choice" data-egg="${index}">${sprite(dragon(index))}${name}</button>`).join('')}</div><div class="baby-preview">${sprite(dragon(0, 1))}<span>이런 아기로 만나요.<br>알 무늬·미리 공개는 추천안이에요.</span></div>`;
    } else if (d.days >= 6 && !d.element) {
      html = `<span class="eyebrow">A POWER OF YOUR OWN</span><h3>너의 힘을 골라 줘!</h3><p>6일의 선물이에요. 소품 보상도 따로 받아요.<br>한 번 정한 속성은 이 친구와 계속 함께해요.</p><div class="element-options">${Object.entries(elements).map(([key, value]) => `<button class="element-choice ${candidate === key ? 'selected' : ''}" data-element="${key}" aria-pressed="${candidate === key}">${sprite(dragon(0, 6, key))}${value.name}</button>`).join('')}</div>${candidate ? `<button class="primary wide element-confirm" id="confirm-element">${elements[candidate].name} 속성으로 함께하기</button>` : ''}`;
    } else if (d.days >= 30) {
      html = `<span class="eyebrow">OUR STORY, COMPLETE</span><h3>멋지게 자랐어요 ✦</h3><p>30일의 달성을 함께한 친구예요.<br>언제든 다시 만나고 공간을 꾸밀 수 있어요.</p>${d === last ? '<button class="primary wide" id="next-egg">다음 알 만나기 →</button>' : '<button class="secondary wide" id="return-growing">키우는 친구에게 가기 →</button>'}`;
    } else {
      html = `<span class="eyebrow">GROWING TOGETHER</span><h3>${d.days === 0 ? '두근두근, 첫 만남을 기다려요' : d.days < 6 ? '오늘도 조금 더 가까이' : d.days < 18 ? '날개에 힘이 생기고 있어요' : '곧, 하늘을 만날 거예요'}</h3><p>${d.days === 0 ? '오늘의 학습을 모두 마치면 부화해요. 처음에는 소품 없이, 친구와 먼저 만나요.' : d.days < 6 ? `속성을 고르기까지 ${6 - d.days}일 남았어요. 쉬는 날에도 함께한 날은 사라지지 않아요.` : `성체가 되기까지 ${30 - d.days}일 남았어요. 연속으로 하지 않아도 차곡차곡 자라요.`}</p><span class="small-tag">${d.days >= 18 ? '18일 중간 성장은 추천안' : '성장은 누적 달성일 기준'}</span>`;
    }
    $('#story-card').innerHTML = html;
  }

  function renderRewards() {
    const count = credits();
    $('#reward-message').textContent = allCollected() ? '소품을 모두 모았어요! 선택 기회는 보관해요.' : count ? `${count}개의 소품을 고를 수 있어요. 나중에 골라도 괜찮아요.` : `새 소품을 고르기까지 ${3 - state.total % 3}일 남았어요.`;
    $('#reward-dots').innerHTML = [0, 1, 2].map((i) => `<i class="${i < state.total % 3 ? 'filled' : ''}"></i>`).join('');
    $('#total-label').textContent = `전체 누적 ${state.total}일`;
    $('#credits-label').textContent = `선택 기회 ${count}개`;
    $('#advance').disabled = !growing() || growing().days >= 30 || state.choosing;
    $('#rest').disabled = !growing();
  }

  function itemArt(item) {
    if (item.slot === 'background') return `<div class="item-art bg-${item.id}"><span>✧</span></div>`;
    if (item.slot === 'nest') return `<div class="item-art"><div class="mini-nest ${item.id}"></div></div>`;
    return `<div class="item-art">${svg(item.id)}</div>`;
  }
  function decoratePanel() {
    const d = current();
    const slotType = ['left', 'right'].includes(activeSlot) ? 'prop' : activeSlot;
    return `<div class="panel-heading"><div><h3>우리만의 작은 숲</h3><p>자리를 고르고 소품을 눌러 보세요. 잠긴 소품도 미리 놓아볼 수 있어요.</p></div><span class="small-tag">추천안 · 4개의 고정 자리</span></div><div class="slot-buttons">${Object.entries(slots).map(([key, name]) => `<button data-slot="${key}" class="${key === activeSlot ? 'active' : ''}" aria-pressed="${key === activeSlot}">${name}</button>`).join('')}</div>${preview ? `<div class="preview-bar"><p><b>${preview.name}</b> 미리보기 · 아직 갖고 있지 않아요.</p><div class="preview-actions"><button class="quiet" id="cancel-preview">미리보기 닫기</button><button class="primary" id="claim" ${credits() < 1 || !d ? 'disabled' : ''}>${!d ? '알을 먼저 골라 주세요' : credits() ? '선택 기회 1개로 받기' : `${3 - state.total % 3}일 더 달성하면 선택`}</button></div></div>` : ''}<div class="items">${items.filter((item) => item.slot === slotType).map((item) => { const owned = state.owned.includes(item.id); const equipped = d?.decor[activeSlot] === item.id; return `<button class="item ${equipped ? 'equipped' : ''}" data-item="${item.id}">${itemArt(item)}<span class="item-state">${equipped ? '배치 중' : owned ? '보유' : '미리보기'}</span><b>${item.name}</b><small>${item.free ? '기본 제공' : owned ? '내가 고른 소품' : '선택 기회 1개'}</small></button>`; }).join('')}</div><p class="hint" style="margin-top:14px">${d ? `${state.viewed + 1}번째 드래곤의 공간을 꾸미고 있어요. 소품은 모든 드래곤이 함께 써요.` : '알을 고른 뒤 기본 소품을 배치할 수 있어요.'} ${allCollected() ? '수집 완료! 앞으로 생기는 소품을 위해 선택 기회를 보관해요. (추천안)' : ''}</p>`;
  }
  function growthPanel() {
    return `<div class="panel-heading"><div><h3>작은 알에서, 너의 드래곤으로</h3><p>도감에서 속성을 바꿔 비교해도 키우는 친구의 속성은 바뀌지 않아요.</p></div><div class="growth-elements">${Object.entries(elements).map(([key, value]) => `<button data-gallery="${key}" class="${galleryElement === key ? 'active' : ''}" aria-pressed="${galleryElement === key}">${value.name}</button>`).join('')}</div></div><div class="growth-grid">${[[1, '첫 만남', '첫 달성일에 진주빛 아기로 부화'], [6, '나만의 힘', '불 · 번개 · 얼음 중 하나 선택'], [18, '날개를 펼치다', '추천안 · 체형과 날개가 한 번 더 성장'], [30, '함께 이룬 성장', '성체 완성, 다음 알과 새 이야기']].map(([days, title, description]) => `<article class="growth-stage">${sprite(dragon(0, days, days === 1 ? null : galleryElement))}<b>${days}일 · ${title}</b><p>${description}</p></article>`).join('')}</div>`;
  }
  function collectionPanel() {
    return `<div class="panel-heading"><div><h3>함께 자란 친구들</h3><p>완성한 친구도 눌러서 다시 보고 꾸밀 수 있어요. 친구마다 공간을 기억해요.</p></div><span class="small-tag">${state.dragons.filter((d) => d.days >= 30).length}마리 육성 완료</span></div><div class="collection-grid">${state.dragons.map((d, index) => `<button class="collection-dragon ${state.viewed === index ? 'active' : ''}" data-dragon="${index}">${sprite(d)}<b>${index + 1}번째 · ${d.element ? elements[d.element].name : eggs[d.egg]} 친구</b><small>${d.days >= 30 ? '육성 완료 · 다시 꾸미기' : `키우는 중 · ${d.days} / 30일`}</small></button>`).join('')}</div>${!state.dragons.length ? '<p class="empty">첫 알을 선택하면 여기에 친구가 생겨요.</p>' : ''}`;
  }
  function todayStatus() {
    const t = state.today;
    if (t.rest) return '오늘은 배정이 없는 쉬는 날이에요. 성장과 보상은 그대로 유지돼요. (추천안)';
    const missing = [];
    if (t.reading < 2) missing.push(`<a href="#study-reading">영어 그림책 읽기 ${2 - t.reading}회 남음</a>`);
    if (!t.quiz) missing.push('<a href="#study-quiz">퀴즈 결과 미입력</a>');
    if (t.credited) return `✓ 오늘 달성 인정 · 성장과 보상 반영 완료${missing.length ? `<br>이미 인정한 달성은 유지돼요. 현재 기록: ${missing.join(' · ')}` : ''}`;
    if (!growing()) return '첫 알을 골라 주세요. 그날부터 성장과 보상을 쌓아요.';
    if (growing().days >= 30) return '다음 알을 선택해 새 이야기를 시작해 주세요.';
    return state.check ? `아직 남아 있어요: ${missing.join(' · ')}` : '아래 학습을 마치면 달성이 자동으로 반영돼요.';
  }
  function todayPanel() {
    const d = growing();
    const t = state.today;
    return `<div class="panel-heading"><div><h3>오늘의 학습 화면에서 만나기</h3><p>학습 목록과 저장 완료를 가정한 체험용 예시예요.</p></div><span class="small-tag">앱 진입 동선 시안</span></div><div class="study"><button class="study-dragon" id="open-world">${sprite(d)}<span><b>${d ? `${stage(d)} · ${d.days} / 30일` : '나의 첫 드래곤 만나기'}</b><small>다음 소품까지 ${3 - state.total % 3}일 · 선택 기회 ${credits()}개</small></span><span style="margin-left:auto">↗</span></button>${t.rest ? '' : `<div class="study-row" id="study-reading"><div><strong>영어 그림책 · A Little Dragon</strong><small>읽기 ${t.reading} / 2회 ${t.reading ? '· 저장됨 (체험)' : ''}</small></div><div class="study-actions"><button id="read-once" ${!d || d.days >= 30 || t.reading >= 2 ? 'disabled' : ''}>1회 읽었어요</button>${t.reading ? '<button id="undo-reading" aria-label="읽기 기록 1회 수정">1회 줄이기</button>' : ''}</div></div><div class="study-row" id="study-quiz"><div><strong>오늘의 퀴즈</strong><small>${t.quiz ? `${t.quiz} · 저장됨 (체험)` : 'PASS·FAIL 모두 완료로 인정해요'}</small></div><div class="study-actions"><button data-quiz="PASS" ${!d || d.days >= 30 ? 'disabled' : ''} aria-pressed="${t.quiz === 'PASS'}">PASS${t.quiz === 'PASS' ? ' ✓' : ''}</button><button data-quiz="FAIL" ${!d || d.days >= 30 ? 'disabled' : ''} aria-pressed="${t.quiz === 'FAIL'}">FAIL${t.quiz === 'FAIL' ? ' ✓' : ''}</button></div></div>`}<div class="study-status" role="status">${todayStatus()}</div><button class="primary wide" id="check-today">오늘 완료 확인</button><button class="quiet wide" id="new-day">다음 학습일 체험 →</button></div>`;
  }
  function render() {
    renderWorld();
    renderStory();
    renderRewards();
    $('#time-buttons').innerHTML = [[0, '알 선택'], [1, '1일 · 부화'], [3, '3일 · 선물'], [6, '6일 · 속성'], [18, '18일 · 성장안'], [30, '30일 · 성체']].map(([days, label]) => `<button data-time="${days}" class="${(current()?.days || 0) === days ? 'active' : ''}">${label}</button>`).join('');
    document.querySelectorAll('[data-tab]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.tab === tab)));
    $('#panel').innerHTML = tab === 'decorate' ? decoratePanel() : tab === 'growth' ? growthPanel() : tab === 'collection' ? collectionPanel() : todayPanel();
  }
  function creditToday() {
    const t = state.today;
    const d = growing();
    if (!d || d.days >= 30 || t.rest || t.credited || t.reading < 2 || !t.quiz) return;
    t.credited = true;
    d.days += 1;
    state.total += 1;
    state.viewed = state.dragons.length - 1;
    preview = null;
    render();
    celebrate(d.days === 1 ? '안녕! 너의 첫 드래곤이 태어났어요.' : d.days === 6 ? '속성을 고를 수 있어요! 소품 선택 기회도 받았어요.' : d.days === 30 ? '30일의 달성! 멋진 성체로 자랐어요.' : state.total % 3 === 0 ? '오늘 달성 인정! 소품 선택 기회 1개를 받았어요.' : '오늘 달성 인정! 드래곤이 한 뼘 자랐어요.');
  }
  function newDay() {
    state.today = { reading: 0, quiz: null, credited: false, rest: false };
    state.check = false;
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.time !== undefined) { reset(Number(data.time)); toast('검토 장면을 새로 열었어요. 이전 체험은 초기화됐어요.'); return; }
    if (data.tab) { showTab(data.tab); return; }
    if (data.egg !== undefined && state.choosing) {
      state.dragons.push(dragon(Number(data.egg)));
      state.viewed = state.dragons.length - 1;
      state.choosing = false;
      candidate = null;
      newDay();
      render();
      toast('첫 달성일에 부화해요. 하루 목표를 달성해 보세요!');
      return;
    }
    if (data.element && current()?.days >= 6 && !current().element) { candidate = data.element; renderStory(); return; }
    if (data.slot) { activeSlot = data.slot; preview = null; render(); return; }
    if (data.item) {
      const item = items.find((entry) => entry.id === data.item);
      if (state.owned.includes(item.id)) {
        if (!current()) { toast('먼저 함께할 알을 골라 주세요.'); return; }
        current().decor[activeSlot] = item.id;
        preview = null;
        toast(`${slots[activeSlot]}에 ${item.name === '비워 두기' ? '빈 공간을 남겼어요.' : item.name + ' 배치 완료!'}`);
      } else preview = item;
      render();
      return;
    }
    if (data.gallery) { galleryElement = data.gallery; render(); return; }
    if (data.dragon !== undefined) { state.viewed = Number(data.dragon); preview = null; candidate = null; showTab('decorate'); $('.world-card').scrollIntoView({ behavior: 'smooth' }); return; }
    if (data.quiz) { state.today.quiz = data.quiz; creditToday(); render(); return; }
    switch (button.id) {
      case 'confirm-element':
        if (candidate && !current().element && current().days >= 6) { current().element = candidate; candidate = null; render(); celebrate('우리만의 힘이 생겼어요! 이 속성은 계속 함께해요.'); }
        break;
      case 'advance': newDay(); state.today.reading = 2; state.today.quiz = 'PASS'; creditToday(); break;
      case 'rest': newDay(); state.today.rest = true; showTab('today', true); toast('쉬어도 괜찮아요. 지금까지의 달성은 그대로예요.'); break;
      case 'reward-open': showTab('decorate', true); break;
      case 'cancel-preview': preview = null; render(); break;
      case 'claim':
        if (preview && credits() > 0 && current() && !state.owned.includes(preview.id)) {
          state.owned.push(preview.id); state.spent += 1; current().decor[activeSlot] = preview.id;
          toast(`${preview.name}, 이제 너의 소품이에요! 모든 드래곤과 함께 쓸 수 있어요.`);
          preview = null; render();
        }
        break;
      case 'next-egg': state.choosing = true; candidate = null; render(); break;
      case 'return-growing': state.viewed = state.dragons.length - 1; render(); break;
      case 'open-world': state.viewed = Math.max(0, state.dragons.length - 1); showTab('decorate'); $('.world-card').scrollIntoView({ behavior: 'smooth' }); break;
      case 'read-once': state.today.reading = Math.min(2, state.today.reading + 1); creditToday(); render(); break;
      case 'undo-reading': state.today.reading = Math.max(0, state.today.reading - 1); render(); break;
      case 'check-today': state.check = true; render(); toast(state.today.credited ? '이미 인정된 달성이에요. 성장과 보상을 다시 지급하지 않아요.' : '아래 안내에서 오늘의 상태를 확인해 주세요.'); break;
      case 'new-day': newDay(); render(); break;
      case 'review-open': $('#review-notes').open = true; $('#review-notes').scrollIntoView({ behavior: 'smooth' }); break;
    }
  });
  reset();
})();
