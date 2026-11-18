import type { Dragon, DragonFoodId, DragonItem } from "./dragon-types";

export function supportsDragonFeeding(dragon: Pick<Dragon, "days" | "element">) {
  return dragon.days > 0 && dragon.days < 18 && (dragon.element === "fire" || dragon.element === "thunder");
}
export function availableDragonFoods(catalog: DragonItem[]) {
  return dragonFoods.filter(food => catalog.some(item => item.id === food.id && item.art === food.id && item.kind === "food" && !item.free));
}
export function ownedDragonFoods(owned: string[]) {
  return dragonFoods.filter(food => owned.includes(food.id));
}
export const feedingFrames = [0, 1, 2, 3, 4, 3, 4, 3, 4, 5, 6, 7, 8, 0];
export function feedingDurations(element: "fire" | "thunder") {
  return [500, element === "fire" ? 300 : 220, 420, 220, 180, 220, 180, 220, 180, 260, 300, 900, 600, 500];
}
export type FeedingSprite = { key: string; role: "bowl" | "bunch" | "food"; x: number; bottom: number; scale: number };
export function feedingSprites(food: FoodDefinition, step: number, progress: number, element: "fire" | "thunder"): FeedingSprite[] {
  const grape = food.id === "thunder-grapes", meat = food.id === "bone-meat";
  const state = step === 0 ? null : step === 1 ? food.states[0] : step === 2 ? food.states[grape ? 1 : 0] : step < 7 ? food.states[grape ? 2 : 1] : meat ? "bone" : null;
  const base = dragonFoodFrames[food.states[0]].contentRect;
  const scale = Math.min(100 / base[2], 100 / base[3]);
  const sprites: FeedingSprite[] = [{ key: step === 0 ? food.bowl : food.bowlAfter, role: "bowl", x: 825, bottom: 777, scale: .23 }];
  if (grape && step >= 2) sprites.push({ key: step >= 3 ? food.bunchAfterOne! : food.states[0], role: "bunch", x: 675, bottom: 777, scale });
  if (!state) return sprites;
  const mouths = element === "fire" ? [[750,350],[750,530],[710,620],[700,320],[705,320],[680,310],[700,290],[720,295],[660,305]] : [[752,345],[755,440],[745,375],[725,353],[705,353],[680,335],[695,270],[715,310],[740,330]];
  const [mx, my] = mouths[feedingFrames[step]];
  const item = dragonFoodFrames[state].contentRect;
  let x = mx + 32, bottom = my + item[3] * scale / 2 + 10;
  if (step === 1) {
    const t = progress * progress * (3 - 2 * progress);
    x = 825 + (mx + 45 - 825) * t; bottom = 660 + (my + item[3] * scale / 2 + 10 - 660) * t;
  }
  if (state === "bone" && step >= 9) { x = 737; bottom = 350 + 418 * (step === 9 ? progress : 1); }
  if (step >= 3 && step < 7) x = mx + (step % 2 === 1 ? 45 : 72) + Math.sin(progress * Math.PI) * 8;
  sprites.push({ key: state, role: "food", x, bottom, scale });
  return sprites;
}

// Approved food catalog coordinates; original PNGs remain the canonical source.
export type FoodDefinition = { id: DragonFoodId; name: string; states: string[]; bowl: string; bowlAfter: string; bunchAfterOne?: string };
export const dragonFoods: FoodDefinition[] = [
  {
    "id": "lava-apple",
    "name": "용암 열매",
    "states": [
      "apple",
      "appleBite"
    ],
    "bowl": "basicBowl",
    "bowlAfter": "basicLessApple"
  },
  {
    "id": "bone-meat",
    "name": "뼈고기",
    "states": [
      "meat",
      "meatBite",
      "bone"
    ],
    "bowl": "basicBowl",
    "bowlAfter": "basicLessMeat"
  },
  {
    "id": "gold-star",
    "name": "황금 별쿠키",
    "states": [
      "cookie",
      "cookieBite"
    ],
    "bowl": "basicBowl",
    "bowlAfter": "basicLessCookie"
  },
  {
    "id": "fire-apple",
    "name": "불꽃 사과",
    "states": [
      "fire",
      "fireBite"
    ],
    "bowl": "magicBowl",
    "bowlAfter": "magicLessApple"
  },
  {
    "id": "thunder-grapes",
    "name": "번개 포도",
    "states": [
      "grapes",
      "grapeWhole",
      "grapeHalf"
    ],
    "bowl": "magicBowl",
    "bowlAfter": "magicLessGrapes",
    "bunchAfterOne": "grapesAfterOne"
  },
  {
    "id": "aurora-star",
    "name": "오로라 별쿠키",
    "states": [
      "star",
      "starBite"
    ],
    "bowl": "magicBowl",
    "bowlAfter": "magicLessCookie"
  }
];
export type FoodFrame = { group: "basic" | "magic"; rect: [number,number,number,number]; contentRect: [number,number,number,number] };
export const dragonFoodFrames: Record<string,FoodFrame> = {"apple":{"group":"basic","rect":[0,0,1152,1024],"contentRect":[229,296,694,696]},"appleBite":{"group":"basic","rect":[1152,0,1152,1024],"contentRect":[261,244,630,748]},"meat":{"group":"basic","rect":[2304,0,1152,1024],"contentRect":[105,290,941,702]},"meatBite":{"group":"basic","rect":[3456,0,1152,1024],"contentRect":[184,347,783,645]},"bone":{"group":"basic","rect":[0,1024,1152,1024],"contentRect":[185,498,782,494]},"cookie":{"group":"basic","rect":[1152,1024,1152,1024],"contentRect":[225,259,702,733]},"cookieBite":{"group":"basic","rect":[2304,1024,1152,1024],"contentRect":[264,412,624,580]},"basicBowl":{"group":"basic","rect":[3456,1024,1152,1024],"contentRect":[174,264,803,728]},"basicLessApple":{"group":"basic","rect":[0,2048,1152,1024],"contentRect":[212,371,727,621]},"basicLessMeat":{"group":"basic","rect":[1152,2048,1152,1024],"contentRect":[211,351,730,641]},"basicLessCookie":{"group":"basic","rect":[2304,2048,1152,1024],"contentRect":[209,357,733,635]},"fire":{"group":"magic","rect":[0,0,1152,1024],"contentRect":[222,256,707,736]},"fireBite":{"group":"magic","rect":[1152,0,1152,1024],"contentRect":[243,248,666,744]},"grapes":{"group":"magic","rect":[2304,0,1152,1024],"contentRect":[204,278,743,714]},"grapeWhole":{"group":"magic","rect":[3456,0,1152,1024],"contentRect":[475,833,201,159]},"grapeHalf":{"group":"magic","rect":[0,1024,1152,1024],"contentRect":[498,858,155,134]},"star":{"group":"magic","rect":[1152,1024,1152,1024],"contentRect":[213,253,726,739]},"starBite":{"group":"magic","rect":[2304,1024,1152,1024],"contentRect":[239,347,673,645]},"magicBowl":{"group":"magic","rect":[3456,1024,1152,1024],"contentRect":[172,253,807,739]},"magicLessApple":{"group":"magic","rect":[0,2048,1152,1024],"contentRect":[213,313,726,679]},"magicLessGrapes":{"group":"magic","rect":[1152,2048,1152,1024],"contentRect":[203,221,745,771]},"magicLessCookie":{"group":"magic","rect":[2304,2048,1152,1024],"contentRect":[196,254,760,738]},"grapesAfterOne":{"group":"magic","rect":[3456,2048,1152,1024],"contentRect":[202,274,747,718]}};
