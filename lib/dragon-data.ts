import type { Dragon, DragonDecor, DragonItem, DragonSlot } from "./dragon-types";
import type { Assignment, ReadingData, TaskType } from "./reading-types";
import { getAssignmentTaskCount, getCompletionCount } from "./reading-calculations";
import { taskDefinitions } from "./reading-data";

export const dragonSlots: DragonSlot[] = ["background", "left", "right"];
export const dragonSlotLabels: Record<DragonSlot, string> = { background: "배경", left: "장식 1", right: "장식 2" };
export const dragonDecorationIds = ["lava-open-foreground", "lava-stone-platform", "lava-central-volcano", "lava-waterfall", "ancient-dragon-relic", "lava-crystal"];
export function availableDragonItems(catalog: DragonItem[]) {
  return catalog.filter((item) => dragonDecorationIds.includes(item.id) && item.art === item.id && item.free
    && item.kind === (dragonDecorationIds.indexOf(item.id) < 4 ? "background" : "prop"));
}
export const dragonElements = { fire: "불", thunder: "번개", ice: "얼음" } as const;
export const dragonEggs = ["반점 무늬 알", "물결 무늬 알", "마름모 무늬 알"];
export function supportsDragonFlight(dragon: Pick<Dragon, "days" | "element">) {
  return dragon.days > 0 && dragon.days < 18 && (dragon.element === null || dragon.element === "fire" || dragon.element === "thunder");
}
export function supportsDragonTailAttack(dragon: Pick<Dragon, "days" | "element">) {
  return dragon.days > 0 && dragon.days < 18 && (dragon.element === "fire" || dragon.element === "thunder");
}
export function supportsDragonClone(dragon: Pick<Dragon, "days" | "element">) {
  return dragon.days > 0 && dragon.days < 18 && (dragon.element === "fire" || dragon.element === "thunder");
}
export function defaultDragonDecor(): DragonDecor {
  return {
    background: { itemId: "lava-open-foreground", x: 50, y: 50 },
    left: { itemId: "ancient-dragon-relic", x: 82, y: 60 }, right: { itemId: "lava-crystal", x: 15, y: 82 },
  };
}
export function dragonStage(days: number) {
  return days >= 30 ? "성체 드래곤" : days >= 18 ? "청소년 드래곤" : days >= 1 ? "아기 드래곤" : "알";
}
export function dragonSprite(dragon: Pick<Dragon, "egg" | "days" | "element">) {
  const column = dragon.days === 0 ? dragon.egg : !dragon.element && dragon.days < 18 ? 3 : dragon.days >= 30 ? 2 : dragon.days >= 18 ? 1 : 0;
  const row = dragon.days === 0 || !dragon.element && dragon.days < 18 ? 0 : dragon.element === "fire" ? 1 : dragon.element === "thunder" ? 2 : 3;
  return {
    backgroundPosition: `${column === 2 && row > 0 ? 68.817 : column * 100 / 3}% ${row * 100 / 3}%`,
    backgroundSize: column === 2 && row > 0 ? "365.71% 400%" : "400% 400%",
    filter: !dragon.element && dragon.days >= 18 ? "grayscale(1) sepia(.15)" : undefined,
  };
}
export function clampDragonPosition(x: number, y: number) {
  return { x: Math.min(85, Math.max(15, x)), y: Math.min(85, Math.max(15, y)) };
}
export type MissingLearning = { assignmentId: string; task: TaskType | "quiz"; title: string; label: string; remaining: number };
export function missingDragonLearning(data: ReadingData, assignments: Assignment[]): MissingLearning[] {
  return assignments.flatMap((assignment) => {
    const title = data.books.find((book) => book.id === assignment.bookId)?.title ?? "책";
    const missing: MissingLearning[] = assignment.tasks.flatMap((task) => {
      const remaining = Math.max(0, getAssignmentTaskCount(assignment, task) - getCompletionCount(data, assignment.id, task));
      return remaining ? [{ assignmentId: assignment.id, task, title, label: taskDefinitions[task].label, remaining }] : [];
    });
    if (assignment.quizEnabled && assignment.quizScore === null) missing.push({ assignmentId: assignment.id, task: "quiz", title, label: "퀴즈 결과 미입력", remaining: 1 });
    return missing;
  });
}
