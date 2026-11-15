import type { DragonBreathAnimation } from "../lib/dragon-art";

export function DragonBreathSprite({ frame, animation }: { frame: number; animation: DragonBreathAnimation }) {
  return <span className={`dragon-fire-breath${animation.artwork.includes("thunder-breath") ? " is-thunder" : ""}`} role="img" aria-label="브레스를 뿜는 아기 드래곤">
    <span className="dragon-fire-breath-frame" style={{
      backgroundImage: `url('${animation.artwork}')`,
      backgroundSize: `${animation.columns * 100}% ${animation.rows * 100}%`,
      backgroundPosition: `${frame % animation.columns * 100 / (animation.columns - 1)}% ${Math.floor(frame / animation.columns) * 100 / (animation.rows - 1)}%`,
    }} />
  </span>;
}
