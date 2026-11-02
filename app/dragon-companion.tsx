"use client";
import { useEffect, useRef, useState } from "react";
import type { DragonController } from "./use-dragon-world";
import { DragonScene, DragonSprite } from "./dragon-scene";
import { clampDragonPosition, defaultDragonDecor, dragonEggs, dragonElements, dragonSlotLabels, dragonSlots, dragonStage } from "../lib/dragon-data";
import type { Dragon, DragonDecor, DragonElement, DragonSlot } from "../lib/dragon-types";

export function DragonFeedback({ controller }: { controller: DragonController }) {
  return <div aria-live="polite">
    {controller.pending && <p>드래곤의 달성·성장·보상 반영을 확인하고 있어요.</p>}
    {controller.error && <div role="alert"><p>{controller.error} 저장한 학습을 다시 할 필요는 없어요.</p>
      <button type="button" disabled={controller.pending} onClick={() => void controller.run(controller.retry ?? { action: "sync" })}>반영 다시 확인</button><button type="button" disabled={controller.pending} onClick={() => void controller.run({ action: "sync" })}>최신 상태 불러오기</button></div>}
  </div>;
}
export function DragonCompanion({ controller }: { controller: DragonController }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const world = controller.world;
  const growing = world?.dragons.at(-1);
  return <section className="dragon-companion" aria-label="나의 드래곤">
    <button ref={trigger} type="button" className="dragon-summary" disabled={!world} onClick={() => setOpen(true)}>
      <DragonSprite dragon={growing ?? { egg: 0, days: 0, element: null }} />
      <span><strong>{growing ? `${dragonStage(growing.days)} · ${growing.days}/30일` : world?.eligible ? "첫 알을 고를 수 있어요!" : "오늘의 학습을 마치면 알을 만나요"}</strong>
        <span>{world?.dragons.length ? `다음 소품 선택 기회까지 ${3 - world.totalDays % 3}일 · 모아 둔 기회 ${world.credits}개` : "알을 고른 다음 달성일부터 자라요"}</span>
        <span className="dragon-open-label">드래곤 보기 · 꾸미기 →</span></span>
    </button>
    <DragonFeedback controller={controller} />
    {open && world && <DragonDialog controller={controller} onClose={() => { setOpen(false); trigger.current?.focus(); }} />}
  </section>;
}
function DragonDialog({ controller, onClose }: { controller: DragonController; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const world = controller.world!;
  const [selectedId, setSelectedId] = useState(world.dragons.at(-1)?.id ?? "");
  const [choosing, setChoosing] = useState(!world.dragons.length);
  const [element, setElement] = useState<DragonElement | null>(null);
  const [eggRequest, setEggRequest] = useState(() => crypto.randomUUID());
  const dragon = world.dragons.find((entry) => entry.id === selectedId) ?? world.dragons.at(-1);
  const canChooseEgg = world.eligible && !world.dragons.some((entry) => entry.days < 30);
  useEffect(() => {
    const target = dialog.current!; target.showModal();
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { target.close(); document.documentElement.style.overflow = previous; };
  }, []);
  return <dialog ref={dialog} className="dragon-dialog" aria-labelledby="dragon-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><div><p className="eyebrow">함께 읽고 함께 자라요</p><h2 id="dragon-dialog-title">작은 드래곤의 숲</h2></div><button type="button" aria-label="드래곤 닫기" onClick={onClose}>닫기</button></header>
    <DragonFeedback controller={controller} />
    <p className="dragon-rewards">전체 보상 달성 {world.totalDays}일 · 소품 선택 기회 <strong>{world.credits}개</strong></p>
    {world.catalog.every((item) => world.owned.includes(item.id)) && <p>소품을 모두 모았어요! 새 소품을 위한 선택 기회는 계속 보관해요.</p>}
    {choosing && canChooseEgg ? <section className="dragon-egg-picker">
      <h3>{world.dragons.length ? "다음 친구를 만나볼까요?" : "첫 알을 골라 주세요"}</h3>
      <div className="dragon-baby-preview"><DragonSprite dragon={{ egg: 0, days: 1, element: null }} /><p>어떤 알이든 이런 아기로 만나요.<br />무늬와 속성은 관계없어요.</p></div>
      <div className="dragon-options">{dragonEggs.map((name, egg) => <button type="button" key={name} aria-label={name} disabled={controller.pending} onClick={async () => {
        if (await controller.run({ action: "egg", id: eggRequest, egg })) { setSelectedId(eggRequest); setChoosing(false); }
      }}><DragonSprite dragon={{ egg, days: 0, element: null }} />{name}</button>)}</div>
      <p>선택한 오늘은 0일이에요. 다음 달성일에 부화해요.</p>
      {dragon && <button type="button" onClick={() => setChoosing(false)}>기존 드래곤 보기</button>}
    </section> : dragon ? <>
      <div className="dragon-collection" aria-label="나의 드래곤 모아보기">{world.dragons.map((entry, index) => <button type="button" key={entry.id} aria-pressed={entry.id === dragon.id} onClick={() => { setSelectedId(entry.id); setElement(null); }}>{index + 1}번째 · {dragonStage(entry.days)}</button>)}</div>
      <h3>{dragon.element ? `${dragonElements[dragon.element]}의 ` : "무속성 "}{dragonStage(dragon.days)} · {dragon.days}/30일</h3>
      <progress max={30} value={dragon.days} aria-label="드래곤 성장" />
      {dragon.days === 0 && <p>알을 선택한 다음 달성일부터 자라요.</p>}
      {dragon.days === 1 && <p className="dragon-celebration">알에서 깨어났어요! 첫 만남을 축하해요 ✦</p>}
      {dragon.days === 18 && <p className="dragon-celebration">날개가 자랐어요! 청소년 드래곤이 되었어요 ✦</p>}
      {dragon.days >= 30 && <p className="dragon-celebration">30일의 달성을 함께했어요! 멋진 성체가 되었어요 ✦</p>}
      {canChooseEgg && <button type="button" onClick={() => { setEggRequest(crypto.randomUUID()); setChoosing(true); }}>다음 알 만나기</button>}
      {dragon.days >= 6 && !dragon.element && <section><h4>드래곤의 속성을 골라요</h4><p>한 번 고르면 바꿀 수 없어요. 소품 선택 기회는 그대로예요.</p>
        <div className="dragon-options">{(Object.keys(dragonElements) as DragonElement[]).map((value) => <button key={value} type="button" aria-label={dragonElements[value]} aria-pressed={element === value} onClick={() => setElement(value)}><DragonSprite dragon={{ ...dragon, element: value }} />{dragonElements[value]}</button>)}</div>
        {element && <button type="button" disabled={controller.pending} onClick={() => void controller.run({ action: "element", id: dragon.id, element })}>{dragonElements[element]} 속성으로 확정</button>}
      </section>}
      <DragonDecorator key={`${dragon.id}:${dragon.version}`} dragon={dragon} controller={controller} />
    </> : <p>오늘 배정된 학습을 모두 마치면 첫 알을 고를 수 있어요. 쉬는 날에도 기존 누적은 유지돼요.</p>}
  </dialog>;
}
function DragonDecorator({ dragon, controller }: { dragon: Dragon; controller: DragonController }) {
  const world = controller.world!;
  const [decor, setDecor] = useState<DragonDecor>(dragon.decor);
  const [slot, setSlot] = useState<DragonSlot>("left");
  const [message, setMessage] = useState("");
  const preview = dragonSlots.some((key) => decor[key].itemId && !world.owned.includes(decor[key].itemId!));
  const dirty = JSON.stringify(decor) !== JSON.stringify(dragon.decor);
  const move = (target: DragonSlot, x: number, y: number) => { setMessage(""); setDecor((current) => ({ ...current, [target]: { ...current[target], ...clampDragonPosition(x, y) } })); };
  const selectedItem = world.catalog.find((entry) => entry.id === decor[slot].itemId);
  return <section className="dragon-decorator" aria-label="공간 꾸미기">
    <DragonScene dragon={dragon} decor={decor} catalog={world.catalog} selected={slot} onSelect={setSlot} onMove={controller.pending ? undefined : move} />
    <p>{preview ? "미리보기 중이에요. 소품을 받은 뒤 저장할 수 있어요." : "둥지와 장식을 끌어 옮겨 보세요. 배치를 마치면 저장해 주세요."}</p>
    <div className="dragon-slot-options">{dragonSlots.map((key) => <button type="button" key={key} aria-pressed={slot === key} onClick={() => setSlot(key)}>{dragonSlotLabels[key]}</button>)}</div>
    <div className="dragon-item-options">{world.catalog.filter((item) => item.kind === (slot === "left" || slot === "right" ? "prop" : slot)).map((item) => <button key={item.id} type="button" aria-pressed={decor[slot].itemId === item.id} disabled={controller.pending} onClick={() => { setMessage(""); setDecor((current) => ({ ...current, [slot]: { ...current[slot], itemId: item.id } })); }}>{item.name}<small>{world.owned.includes(item.id) ? "보유" : "미리보기"}</small></button>)}
      {(slot === "left" || slot === "right") && <button type="button" disabled={controller.pending} onClick={() => setDecor((current) => ({ ...current, [slot]: { ...current[slot], itemId: null } }))}>비우기</button>}
    </div>
    {selectedItem && !world.owned.includes(selectedItem.id) && <button type="button" disabled={controller.pending || world.credits < 1} onClick={() => void controller.run({ action: "claim", itemId: selectedItem.id })}>{selectedItem.name} 받기 · 기회 1개</button>}
    {slot !== "background" && <div className="dragon-move-controls" aria-label="소품 위치 조정">{[["왼쪽", -3, 0], ["오른쪽", 3, 0], ["위", 0, -3], ["아래", 0, 3]].map(([label, dx, dy]) => <button type="button" key={label} disabled={controller.pending || !decor[slot].itemId} onClick={() => move(slot, decor[slot].x + Number(dx), decor[slot].y + Number(dy))}>{label}</button>)}
      <button type="button" disabled={controller.pending} onClick={() => { const original = defaultDragonDecor()[slot]; move(slot, original.x, original.y); }}>기본 위치</button></div>}
    <div className="dragon-save-controls"><button type="button" className="primary-button" disabled={controller.pending || preview || !dirty} onClick={async () => { if (await controller.run({ action: "decorate", id: dragon.id, version: dragon.version, decor })) setMessage("꾸미기를 저장했어요."); }}>꾸미기 저장</button>
      <button type="button" disabled={controller.pending || !dirty} onClick={() => { setDecor(dragon.decor); setMessage("저장 전 변경을 취소했어요."); }}>변경 취소</button></div>
    <p aria-live="polite">{message || (dirty ? "아직 저장하지 않은 배치예요. 다른 드래곤을 보거나 닫으면 저장되지 않아요." : "저장된 배치예요.")}</p>
  </section>;
}
