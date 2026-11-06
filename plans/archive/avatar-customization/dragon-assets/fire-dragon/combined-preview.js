const dragon = document.querySelector('#dragon');
const breath = document.querySelector('#breath');
const blink = document.querySelector('#blink');
const flame = document.querySelector('#flame');
const pause = document.querySelector('#pause');
const roar = document.querySelector('#roar');
const fire = document.querySelector('#fire');
const status = document.querySelector('#status');
const base = 'concepts/adult.png';
const charge = 'motions/fire-breath/charge.png';
const roarFrames = ['01-mouth-opening', '02-forward', '03-head-rising', '04-head-raised']
  .map(name => `motions/roar/${name}.png`);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let stopped = reducedMotion;
let busy = false;
let idleAnimations = [];
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function stopIdle() {
  idleAnimations.forEach(animation => animation.cancel());
  idleAnimations = [];
}

function startIdle() {
  dragon.src = base;
  if (stopped) return;
  idleAnimations = [
    breath.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }],
      { duration: 4000, iterations: Infinity, easing: 'ease-in-out' }),
    blink.animate([
      { opacity: 0, offset: 0 }, { opacity: 0, offset: .92 },
      { opacity: 1, offset: .94 }, { opacity: 1, offset: .96 },
      { opacity: 0, offset: .98 }, { opacity: 0, offset: 1 }
    ], { duration: 6000, iterations: Infinity })
  ];
}

async function perform(action) {
  if (busy) return;
  busy = true;
  [pause, roar, fire].forEach(button => { button.disabled = true; });
  stopIdle();
  try {
    if (action === 'roar') {
      status.textContent = '하늘을 향해 포효해요!';
      const sequence = [...roarFrames, ...roarFrames.slice(0, -1).reverse()];
      for (const [index, frame] of sequence.entries()) {
        dragon.src = frame;
        await wait(index === 3 ? 900 : 180);
      }
    } else {
      status.textContent = '불의 기운을 모아요…';
      dragon.src = charge;
      await wait(450);
      status.textContent = '불을 뿜어요!';
      flame.classList.add('active');
      await wait(1500);
      flame.classList.remove('active');
      await wait(300);
    }
  } finally {
    flame.classList.remove('active');
    startIdle();
    status.textContent = stopped ? '대기 동작을 멈췄어요.' : '다음 동작을 기다리고 있어요.';
    busy = false;
    [pause, roar, fire].forEach(button => { button.disabled = false; });
  }
}

pause.addEventListener('click', () => {
  stopped = !stopped;
  stopIdle();
  if (!stopped) startIdle();
  pause.textContent = stopped ? '대기 재생하기' : '대기 멈추기';
  status.textContent = stopped ? '대기 동작을 멈췄어요.' : '다음 동작을 기다리고 있어요.';
});
roar.addEventListener('click', () => perform('roar'));
fire.addEventListener('click', () => perform('fire'));

Promise.all([base, charge, ...roarFrames, breath.src, blink.src, flame.src].map(src => {
  const image = new Image();
  image.src = src;
  return image.decode();
})).then(() => {
  startIdle();
  pause.textContent = stopped ? '대기 재생하기' : '대기 멈추기';
  status.textContent = '준비됐어요. 동작을 골라 보세요.';
  [pause, roar, fire].forEach(button => { button.disabled = false; });
}).catch(() => {
  status.textContent = '이미지를 불러오지 못했어요. 파일 위치를 확인하고 새로고침해 주세요.';
});
