import type { DragonTailAttackAnimation } from "../lib/dragon-art";

export function DragonTailAttackSprite({ animation, frame, resting, mirrored }: {
  animation: DragonTailAttackAnimation; frame: number; resting: boolean; mirrored: boolean;
}) {
  return <span className={`dragon-tail-attack${animation.holdLastFrame ? " is-fire" : ""}`} role="img"
    aria-label={resting ? "공격 후 서 있는 아기 드래곤" : "꼬리 공격하는 아기 드래곤"}
    style={mirrored ? { transform: "scaleX(-1)" } : undefined}>
    <span className="dragon-tail-attack-frame" style={{
      backgroundImage: `url('${animation.artwork}')`,
      backgroundSize: `${animation.columns * 100}% ${animation.rows * 100}%`,
      backgroundPosition: `${frame % animation.columns * 100 / (animation.columns - 1)}% ${Math.floor(frame / animation.columns) * 100 / (animation.rows - 1)}%`,
    }} />
  </span>;
}
