import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { TaskCompletionFeedback } from "../../app/task-completion-feedback";
import type { AudioReturnState } from "../../lib/audio-return";
import type { CompletionRequestState } from "../../lib/task-completion";

const attempt = {
  expectedCount: 0,
  payload: { assignmentId: "assignment-1", taskType: "self" as const, completedAt: "2026-10-16T01:00:00.000Z", minutes: 5, audioOpenedAt: null, count: 1 },
};

function request(status: Exclude<CompletionRequestState["status"], "idle">, message: string): CompletionRequestState {
  if (status === "success" || status === "conflict") return { status, attempt, completion: null, message };
  return { status, attempt, message };
}

function audioReturn(status: AudioReturnState["status"], message: string): AudioReturnState {
  return { status, openedAt: "2026-10-16T01:02:00.000Z", returnedAt: "2026-10-16T01:07:00.000Z", message };
}

function renderFeedback(overrides: Partial<React.ComponentProps<typeof TaskCompletionFeedback>> = {}) {
  const callbacks = { onComplete: vi.fn(), onCheck: vi.fn(), onRetry: vi.fn(), onRetryReturn: vi.fn() };
  render(
    <TaskCompletionFeedback
      taskType="self" completedCount={0} targetCount={2} dataStatus="ready"
      {...callbacks} {...overrides}
    />,
  );
  return callbacks;
}

test("C03-E01: 실행 기록 없는 idle 오디오 과제는 완료 안내를 렌더링하지 않는다", () => {
  // Given
  const props = { taskType: "listen" as const };

  // When
  renderFeedback(props);

  // Then
  expect(screen.queryByText("읽기 오디오 실행 기록")).toBeNull();
});

test("C03-E02: loading 상태는 학습 기록을 불러오는 status 역할로 안내한다", () => {
  // Given
  const props = { dataStatus: "loading" as const };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("status").textContent).toBe("학습 기록을 불러오고 있습니다.");
});

test("C03-F01: data error 상태는 학습 기록을 불러오지 못한 status 역할로 안내한다", () => {
  // Given
  const props = { dataStatus: "error" as const };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("status").textContent).toBe("학습 기록을 불러오지 못했습니다.");
});

test("C03-E03: pending 저장 중에는 다음 완료 버튼이 비활성화되고 상태 메시지를 표시한다", () => {
  // Given
  const props = { request: request("pending", "완료 기록을 저장하고 있습니다.") };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("button", { name: "1회 완료" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("status").textContent).toBe("완료 기록을 저장하고 있습니다.");
});

test("C03-N01: 저장 완료 상태에서 완료 버튼은 onComplete만 한 번 호출한다", async () => {
  // Given
  const callbacks = renderFeedback({ request: request("success", "완료 기록을 저장했습니다.") });
  const user = userEvent.setup();

  // When
  await user.click(screen.getByRole("button", { name: "1회 완료" }));

  // Then
  expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
  expect(callbacks.onCheck).not.toHaveBeenCalled();
  expect(callbacks.onRetry).not.toHaveBeenCalled();
  expect(callbacks.onRetryReturn).not.toHaveBeenCalled();
});

test("C03-E04: checking 상태는 완료 버튼을 비활성화하고 결과 확인 status를 표시한다", () => {
  // Given
  const props = { request: request("checking", "완료 저장 결과를 확인하고 있습니다.") };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("button", { name: "1회 완료" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("status").textContent).toBe("완료 저장 결과를 확인하고 있습니다.");
});

test("C03-F02: uncertain 상태의 저장 결과 확인은 onCheck만 한 번 호출한다", async () => {
  // Given
  const callbacks = renderFeedback({ request: request("uncertain", "완료 기록이 아직 확인되지 않았습니다.") });
  const user = userEvent.setup();

  // When
  await user.click(screen.getByRole("button", { name: "저장 결과 확인" }));

  // Then
  expect(screen.getByRole("status").textContent).toBe("완료 기록이 아직 확인되지 않았습니다.");
  expect(screen.getByRole("button", { name: "1회 완료" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "저장 결과 확인" })).toHaveProperty("disabled", false);
  expect(screen.getByRole("button", { name: "같은 요청 재시도" })).toHaveProperty("disabled", false);
  expect(callbacks.onCheck).toHaveBeenCalledTimes(1);
  expect(callbacks.onComplete).not.toHaveBeenCalled();
  expect(callbacks.onRetry).not.toHaveBeenCalled();
  expect(callbacks.onRetryReturn).not.toHaveBeenCalled();
});

test("C03-F03: error 상태의 같은 요청 재시도는 onRetry만 한 번 호출하고 alert를 표시한다", async () => {
  // Given
  const callbacks = renderFeedback({ request: request("error", "완료 기록을 저장하지 못했습니다.") });
  const user = userEvent.setup();

  // When
  await user.click(screen.getByRole("button", { name: "같은 요청 재시도" }));

  // Then
  expect(screen.getByRole("alert").textContent).toBe("완료 기록을 저장하지 못했습니다.");
  expect(screen.getByRole("button", { name: "1회 완료" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "저장 결과 확인" })).toHaveProperty("disabled", false);
  expect(screen.getByRole("button", { name: "같은 요청 재시도" })).toHaveProperty("disabled", false);
  expect(callbacks.onRetry).toHaveBeenCalledTimes(1);
  expect(callbacks.onComplete).not.toHaveBeenCalled();
  expect(callbacks.onCheck).not.toHaveBeenCalled();
  expect(callbacks.onRetryReturn).not.toHaveBeenCalled();
});

test("C03-F04: 복귀 저장 error의 재시도는 onRetryReturn만 한 번 호출한다", async () => {
  // Given
  const callbacks = renderFeedback({ audioReturn: audioReturn("error", "복귀 시간을 저장하지 못했습니다.") });
  const user = userEvent.setup();

  // When
  await user.click(screen.getByRole("button", { name: "복귀 시간 다시 저장" }));

  // Then
  expect(screen.getByRole("alert").textContent).toBe("복귀 시간을 저장하지 못했습니다. 수동 완료는 계속 저장할 수 있습니다.");
  expect(screen.getByRole("button", { name: "1회 완료" })).toHaveProperty("disabled", false);
  expect(screen.getByRole("button", { name: "복귀 시간 다시 저장" })).toHaveProperty("disabled", false);
  expect(callbacks.onRetryReturn).toHaveBeenCalledTimes(1);
  expect(callbacks.onComplete).not.toHaveBeenCalled();
  expect(callbacks.onCheck).not.toHaveBeenCalled();
  expect(callbacks.onRetry).not.toHaveBeenCalled();
});

test("C03-F05: 충돌한 복귀 기록은 alert를 표시하지만 수동 완료 버튼은 유지한다", () => {
  // Given
  const props = { audioReturn: audioReturn("conflict", "복귀 기록이 변경되었습니다.") };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("alert").textContent).toBe("복귀 기록이 변경되었습니다. 수동 완료는 계속 저장할 수 있습니다.");
  expect(screen.getByRole("button", { name: "1회 완료" })).toHaveProperty("disabled", false);
});

test("C03-F06: 충돌한 완료 요청은 status 메시지와 활성 완료 버튼만 표시한다", () => {
  // Given
  const props = { request: request("conflict", "완료 기록이 이미 변경되었습니다.") };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("status").textContent).toBe("완료 기록이 이미 변경되었습니다.");
  expect(screen.getByRole("button", { name: "1회 완료" })).toHaveProperty("disabled", false);
  expect(screen.queryByRole("button", { name: "저장 결과 확인" })).toBeNull();
  expect(screen.queryByRole("button", { name: "같은 요청 재시도" })).toBeNull();
});

test("C03-E05: 목표 횟수에 도달하면 비활성화된 완료됨 버튼을 표시한다", () => {
  // Given
  const props = { completedCount: 2, targetCount: 2, request: request("success", "완료 기록을 저장했습니다.") };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("button", { name: "완료됨" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("status").textContent).toBe("완료 기록을 저장했습니다.");
});

test("C03-N02: 단어 읽기 실행 기록은 링크 label과 열기·복귀 시각을 표시한다", () => {
  // Given
  const props = {
    taskType: "wordRead" as const,
    launch: { openedAt: "2026-10-16T10:02:00.000", returnedAt: "2026-10-16T10:07:00.000" },
  };

  // When
  renderFeedback(props);

  // Then
  expect(screen.getByRole("heading", { name: "단어 읽기 링크 실행 기록" }).textContent).toBe("단어 읽기 링크 실행 기록");
  expect(screen.getByText("링크 열기 10:02 · 앱으로 돌아온 시간 10:07").textContent).toBe("링크 열기 10:02 · 앱으로 돌아온 시간 10:07");
});
