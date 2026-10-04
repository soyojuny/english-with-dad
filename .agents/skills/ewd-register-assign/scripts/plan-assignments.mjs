import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const routines = JSON.parse(readFileSync(new URL("../references/routines.json", import.meta.url), "utf8"));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dayMilliseconds = 24 * 60 * 60 * 1000;

function requireId(value, label) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new Error(`${label}: 확인된 UUID가 필요합니다.`);
  }
}

export function planAssignments(input) {
  requireId(input.ownerUserId, "부모 계정");
  if (input.weeks !== 1 && input.weeks !== 2) {
    throw new Error("배정 기간은 1주 또는 2주여야 합니다.");
  }
  const start = new Date(`${input.startSunday}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startSunday) || Number.isNaN(start.getTime()) ||
      start.toISOString().slice(0, 10) !== input.startSunday || start.getUTCDay() !== 0) {
    throw new Error("시작일은 YYYY-MM-DD 형식의 실제 일요일이어야 합니다.");
  }
  if (!Array.isArray(input.bundles) || !input.bundles.length) {
    throw new Error("아동·용도별 책 묶음이 필요합니다.");
  }

  const roleIds = new Map();
  const seenBundles = new Set();
  const assignments = [];
  for (const bundle of input.bundles) {
    if (!["first", "second"].includes(bundle.child) ||
        !["reading", "shadow", "picture"].includes(bundle.purpose)) {
      throw new Error("확인된 아동 역할(first/second)과 용도(reading/shadow/picture)가 필요합니다.");
    }
    requireId(bundle.childId, "아동");
    const childId = bundle.childId.toLowerCase();
    if ((roleIds.has(bundle.child) && roleIds.get(bundle.child) !== childId) ||
        [...roleIds].some(([role, id]) => role !== bundle.child && id === childId)) {
      throw new Error("첫째·둘째 역할과 아동 ID 매핑이 일치하지 않습니다.");
    }
    roleIds.set(bundle.child, childId);
    const bundleKey = `${bundle.child}:${bundle.purpose}`;
    if (seenBundles.has(bundleKey)) throw new Error("같은 아동·용도 묶음이 중복되었습니다.");
    seenBundles.add(bundleKey);

    const rule = routines[bundle.child][bundle.purpose];
    const expectedBooks = (6 / rule.blockDays) * rule.booksPerBlock * input.weeks;
    if (!Array.isArray(bundle.bookIds) || bundle.bookIds.length !== expectedBooks) {
      throw new Error(`${bundle.child} ${bundle.purpose}: ${input.weeks}주에 ${expectedBooks}권이 필요합니다.`);
    }
    bundle.bookIds.forEach((id) => requireId(id, "책"));
    const bookIds = bundle.bookIds.map((id) => id.toLowerCase());
    if (new Set(bookIds).size !== bookIds.length) {
      throw new Error("한 묶음의 책 순서에 중복 ID가 있습니다. 임의로 같은 책을 반복하지 않습니다.");
    }

    for (let day = 0; day < 6 * input.weeks; day += 1) {
      const dateOffset = Math.floor(day / 6) * 7 + day % 6;
      const date = new Date(start.getTime() + dateOffset * dayMilliseconds).toISOString().slice(0, 10);
      const firstBook = Math.floor(day / rule.blockDays) * rule.booksPerBlock;
      for (const bookId of bookIds.slice(firstBook, firstBook + rule.booksPerBlock)) {
        assignments.push({
          owner_user_id: input.ownerUserId.toLowerCase(),
          child_id: childId,
          date,
          book_id: bookId,
          activity_category: rule.activityCategory,
          tasks: Object.keys(rule.taskCounts),
          task_counts: { ...rule.taskCounts },
          quiz_enabled: rule.quizEnabled,
        });
      }
    }
  }

  return {
    routineUpdatedAt: routines.updatedAt,
    startSunday: input.startSunday,
    endDate: new Date(start.getTime() + ((input.weeks - 1) * 7 + 5) * dayMilliseconds).toISOString().slice(0, 10),
    weeks: input.weeks,
    assignments,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error("사용법: node plan-assignments.mjs <입력 JSON 경로>");
    const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
    console.log(JSON.stringify(planAssignments(input), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
