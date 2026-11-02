export type DragonElement = "fire" | "thunder" | "ice";
export type DragonSlot = "background" | "nest" | "left" | "right";
export type DragonPlacement = { itemId: string | null; x: number; y: number };
export type DragonDecor = Record<DragonSlot, DragonPlacement>;
export type Dragon = {
  id: string;
  egg: number;
  selectedDate: string;
  days: number;
  element: DragonElement | null;
  decor: DragonDecor;
  version: number;
};
export type DragonItem = {
  id: string;
  name: string;
  kind: "background" | "nest" | "prop";
  art: string;
  free: boolean;
};
export type DragonWorld = {
  today: string;
  credited: boolean;
  eligible: boolean;
  totalDays: number;
  credits: number;
  owned: string[];
  dragons: Dragon[];
  catalog: DragonItem[];
};
export type DragonAction =
  | { action: "sync" }
  | { action: "egg"; id: string; egg: number }
  | { action: "element"; id: string; element: DragonElement }
  | { action: "claim"; itemId: string }
  | { action: "decorate"; id: string; version: number; decor: DragonDecor };
