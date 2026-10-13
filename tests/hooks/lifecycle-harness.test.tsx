import { StrictMode, useEffect } from "react";
import { render, renderHook, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

test("T01-E08: StrictMode effect는 timer와 listener를 하나만 유지하고 unmount에서 해제한다", () => {
  // Given: test-only hook probes the harness, not product request behavior.
  vi.useFakeTimers();
  const tick = vi.fn();
  const event = vi.fn();
  const view = renderHook(() => {
    useEffect(() => {
      const timer = setInterval(tick, 1000);
      window.addEventListener("harness-event", event);
      return () => {
        clearInterval(timer);
        window.removeEventListener("harness-event", event);
      };
    }, []);
  }, { wrapper: StrictMode });

  // When
  vi.advanceTimersByTime(1000);
  window.dispatchEvent(new Event("harness-event"));
  view.unmount();
  vi.advanceTimersByTime(1000);
  window.dispatchEvent(new Event("harness-event"));

  // Then
  expect(tick).toHaveBeenCalledTimes(1);
  expect(event).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

test("T01-E09: setup 정리를 위해 DOM storage env spy timer를 생성한다", () => {
  // Given
  render(<button>cleanup probe</button>);
  localStorage.setItem("harness", "local");
  sessionStorage.setItem("harness", "session");
  vi.stubEnv("EWD_HARNESS_PROBE", "changed");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.useFakeTimers();

  // When
  setTimeout(() => {}, 1000);

  // Then: deliberately leave resources for the shared afterEach.
  expect(screen.getByRole("button", { name: "cleanup probe" })).toBeDefined();
  expect(vi.getTimerCount()).toBe(1);
});

test("T01-E10: 다음 test는 DOM storage env spy timer 상태를 상속하지 않는다", () => {
  // Given
  const probeEnv = process.env.EWD_HARNESS_PROBE;

  // When
  const buttons = screen.queryAllByRole("button");

  // Then: also passes independently; no prior test is required.
  expect(buttons).toHaveLength(0);
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
  expect(probeEnv).toBeUndefined();
  expect(vi.isMockFunction(console.info)).toBe(false);
  expect(vi.isFakeTimers()).toBe(false);
});
