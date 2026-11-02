import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { ComponentProps } from "react";
import { DragonCompletionCheck } from "../../app/dragon-completion-check";
import { emptyReadingData } from "../../lib/reading-data";
const boundary = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("../../lib/supabase/reading-store", () => ({ fetchChildTodayData: boundary.fetch }));
const assignment = { id: "a", childId: "c", bookId: "b", date: "2026-11-03", activityCategory: "focusListen", tasks: ["self"], taskCounts: { self: 2 }, quizEnabled: true, quizScore: null } as const;
function props(): ComponentProps<typeof DragonCompletionCheck> {
  return {
    controller: { world: null, pending: false, error: "", retry: null, run: vi.fn().mockResolvedValue(true) },
    data: emptyReadingData, assignments: [], ready: true, completionStates: {}, quizPending: false,
    supabase: {} as ComponentProps<typeof DragonCompletionCheck>["supabase"], ownerUserId: "o", childId: "c", date: "2026-11-03", onNavigate: vi.fn(), onSnapshot: vi.fn(),
  };
}
beforeEach(() => { boundary.fetch.mockReset(); });
test("학습 로딩 중 0/0은 달성으로 표시하지 않는다", async () => {
  // Given
  const options = props(); options.ready = false; render(<DragonCompletionCheck {...options} />);
  // When
  await userEvent.click(screen.getByRole('button', { name: '오늘 완료 확인' }));
  // Then
  expect(screen.getByText(/아직 달성 여부를 알 수 없어요/)).toBeTruthy();
  expect(boundary.fetch).not.toHaveBeenCalled();
  expect(options.controller.run).not.toHaveBeenCalled();
});
test("새로 조회한 학습을 화면에 전달하여 추가된 배정으로 이동할 수 있게 한다", async () => {
  // Given
  const options = props(); const saved = { ...emptyReadingData, assignments: [{ ...assignment, tasks: ["self"] }] };
  boundary.fetch.mockResolvedValue(saved); render(<DragonCompletionCheck {...options} />);
  // When
  await userEvent.click(screen.getByRole('button', { name: '오늘 완료 확인' }));
  // Then
  await waitFor(() => expect(options.onSnapshot).toHaveBeenCalledWith(saved));
  expect(options.controller.run).toHaveBeenCalledWith({ action: 'sync' });
});
test("조회 실패는 학습 완료로 표시하지 않고 재확인을 안내한다", async () => {
  // Given
  const options = props(); boundary.fetch.mockRejectedValue(new Error('offline')); render(<DragonCompletionCheck {...options} />);
  // When
  await userEvent.click(screen.getByRole('button', { name: '오늘 완료 확인' }));
  // Then
  expect((await screen.findByRole('alert')).textContent).toContain('학습 기록을 확인하지 못했어요');
  expect(options.controller.run).not.toHaveBeenCalled();
  expect(options.onSnapshot).not.toHaveBeenCalled();
});
test("횟수 부족과 퀴즈 미입력을 안내하고 저장 확인 중에는 재수행을 요구하지 않는다", async () => {
  // Given
  const options = props(); options.assignments = [{ ...assignment, tasks: ["self"] }];
  options.quizPending = true; boundary.fetch.mockResolvedValue(emptyReadingData); render(<DragonCompletionCheck {...options} />);
  // When
  await userEvent.click(screen.getByRole('button', { name: '오늘 완료 확인' }));
  // Then
  await waitFor(() => expect(screen.queryByText('저장된 오늘 학습을 확인하고 있어요.')).toBeNull());
  expect(screen.getByText(/학습을 다시 할 필요는 없어요/)).toBeTruthy();
  expect(screen.getByRole('button', { name: /스스로 읽기 2회 남음/ })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: /퀴즈 결과 미입력/ }));
  expect(options.onNavigate).toHaveBeenCalledWith('a', 'quiz');
});
