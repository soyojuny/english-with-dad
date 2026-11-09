import type { Dragon } from "./dragon-types";

const root = "/assets/dragons";
export const dragonFlightAnimations = {
  neutral: { prefix: "", columns: 6, fps: 12, frames: { takeoff: 30, move: 12, hover: 9 } },
  fire: { prefix: "fire-", columns: 4, fps: 8, frames: { takeoff: 8, move: 8, hover: 8 } },
  thunder: { prefix: "thunder-", columns: 4, fps: 9, frames: { takeoff: 6, move: 8, hover: 8 } },
};
export const dragonBackgroundArt: Record<string, string> = Object.fromEntries(
  ["lava-open-foreground", "lava-stone-platform", "lava-central-volcano", "lava-waterfall"]
    .map((name) => [name, `${root}/habitats/${name}.webp`]),
);
export const dragonPropArt: Record<string, string> = {
  "ancient-dragon-relic": `${root}/props/ancient-dragon-relic.webp`,
  "lava-crystal": `${root}/props/lava-crystal.webp`,
};
export function dragonArtwork(dragon: Pick<Dragon, "egg" | "days" | "element">) {
  if (dragon.days === 0) {
    const name = ["spotted", "striped", "diamond"][dragon.egg];
    return name ? `${root}/eggs/${name}.webp` : undefined;
  }
  if (dragon.days < 18) return `${root}/baby/${dragon.element ?? "neutral"}.webp`;
  return dragon.days >= 30 && dragon.element === "fire" ? `${root}/adult-fire.webp` : undefined;
}
