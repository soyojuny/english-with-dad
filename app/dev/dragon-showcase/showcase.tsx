"use client";

import { useState } from "react";
import { DragonScene } from "../../dragon-scene";
import { defaultDragonDecor, dragonElements } from "../../../lib/dragon-data";
import { dragonBackgroundArt, dragonPropArt } from "../../../lib/dragon-art";
import type { Dragon, DragonElement, DragonItem } from "../../../lib/dragon-types";

const stages = [{ label: "알", days: 0 }, { label: "아기", days: 1 }, { label: "청소년", days: 18 }, { label: "성체", days: 30 }];
const elements: { label: string; value: DragonElement | "neutral" }[] = [
  { label: "무속성", value: "neutral" },
  ...Object.entries(dragonElements).map(([value, label]) => ({ label, value: value as DragonElement })),
];
const backgrounds = Object.keys(dragonBackgroundArt);
const catalog: DragonItem[] = [
  ...backgrounds.map((id) => ({ id, art: id, name: id, kind: "background" as const, free: true })),
  ...Object.keys(dragonPropArt).map((id) => ({ id, art: id, name: id, kind: "prop" as const, free: true })),
];

function Panel({ title, background }: { title: string; background: string }) {
  const [days, setDays] = useState(1);
  const [element, setElement] = useState<DragonElement | "neutral">("neutral");
  const [egg, setEgg] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flight, setFlight] = useState(false);
  const [tailAttack, setTailAttack] = useState(false);
  const [clone, setClone] = useState(false);
  const decor = { ...defaultDragonDecor(), background: { ...defaultDragonDecor().background, itemId: background } };
  const dragon: Dragon = { id: title, egg, days, element: element === "neutral" ? null : element, selectedDate: "", decor, version: 0, skills: [...(flight ? ["fly" as const] : []), ...(tailAttack ? ["tail-attack" as const] : []), ...(clone ? ["clone" as const] : [])] };
  return <section className="showcase-panel dragon-screen">
    <h2>{title}</h2>
    <div className="showcase-controls">
      <label>성장 단계<select value={days} onChange={(e) => setDays(Number(e.target.value))}>{stages.map((stage) => <option key={stage.days} value={stage.days}>{stage.label}</option>)}</select></label>
      {days === 0 ? <label>알 무늬<select value={egg} onChange={(e) => setEgg(Number(e.target.value))}><option value={0}>반점</option><option value={1}>물결</option><option value={2}>마름모</option></select></label> :
        <label>속성<select value={element} onChange={(e) => setElement(e.target.value as DragonElement | "neutral")}>{elements.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>}
      <button type="button" onClick={() => setPaused(!paused)}>{paused ? "동작 재생" : "동작 일시정지"}</button>
      {days > 0 && days < 18 && (element === "neutral" || element === "fire" || element === "thunder") && <label><input type="checkbox" checked={flight} onChange={(event) => setFlight(event.target.checked)} />날기 획득</label>}
      {days > 0 && days < 18 && (element === "fire" || element === "thunder") && <label><input type="checkbox" checked={tailAttack} onChange={(event) => setTailAttack(event.target.checked)} />꼬리 공격 획득</label>}
      {days > 0 && days < 18 && (element === "fire" || element === "thunder") && <label><input type="checkbox" checked={clone} onChange={(event) => setClone(event.target.checked)} />분신 획득</label>}
    </div>
    <div className={paused ? "showcase-paused" : ""}><DragonScene dragon={dragon} decor={decor} catalog={catalog} paused={paused} /></div>
    {days > 0 && days < 18 && (element === "fire" || element === "thunder") && <p>분신 획득 → 분신 놀이 · 무작위 단서를 한 번 보여 주고 빛 속에서 분신 등장 · 배경 속 진짜를 터치하면 반짝인 뒤 대기 모습으로 복귀 · 단서 다시 보기</p>}
    {days > 0 && days < 18 && (element === "fire" || element === "thunder") && <p>꼬리 공격 획득 후 지상에서 버튼으로 공격 · 공격 중 이동·날기 잠금 · 앉아 있으면 일어서고 공격 · 불은 정면 대기를 생략하고 마지막 반대 방향 자세로 대기</p>}
    <p>{days > 0 && days < 18 ? element === "neutral" ? "장면을 드래그해 이동 · 5초 후 서기→2rus-2→A→B→앉기 · 터치하면 역순으로 일어서기 · 날기 획득 시 버튼으로 이륙/착륙, 좌우 드래그로 비행" : element === "fire" ? "장면을 드래그해 이동 · 불 아기 B→D→E 걷기 · 5초 후 5자세로 앉기 · 터치하면 역순으로 일어서기 · 날기 획득 시 8프레임 이륙/착륙, 좌우 드래그로 비행" : element === "thunder" ? "장면을 드래그해 이동 · 번개 아기 3자세 걷기 · 5초 후 5자세로 앉기 · 터치하면 역순으로 일어서기 · 날기 획득 시 준비 자세 후 상승, 6프레임 이착륙·8프레임 비행" : "장면을 드래그해 이동 · 얼음 아기 B→D→E 걷기 · 5초 후 4자세로 앉기 · 터치하면 역순으로 일어서기" : "현재 앱에 연결된 동작 없음"}{days >= 18 && !(days >= 30 && element === "fire") ? " · 기존 대체 원화" : ""}</p>
  </section>;
}

export function DragonShowcase() {
  const [background, setBackground] = useState(backgrounds[0]);
  return <main className="showcase"><h1>드래곤 에셋 쇼케이스</h1>
    <p>실제 앱 화면을 나란히 비교합니다. 변경 전후 비교는 현재 저장된 원화끼리만 가능합니다.</p>
    <label>배경 <select value={background} onChange={(e) => setBackground(e.target.value)}>{backgrounds.map((id, i) => <option key={id} value={id}>배경 {i + 1}</option>)}</select></label>
    <div className="showcase-grid"><Panel title="비교 A" background={background} /><Panel title="비교 B" background={background} /></div>
    <p>포효와 브레스는 아직 앱에 연결되지 않았습니다. 새 동작을 앱에 추가할 때 이 화면의 선택지도 함께 갱신하세요.</p>
  </main>;
}
