import { afterEach, beforeEach, expect, vi } from "vitest";

let blockedFetch: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  blockedFetch = vi.fn<typeof fetch>(async (input) => {
    throw new Error(`Unexpected fetch: ${String(input)}`);
  });
  vi.stubGlobal("fetch", blockedFetch);
});

afterEach(() => {
  try {
    // A caught network rejection must still fail the test.
    expect(blockedFetch, "Unexpected fetch must use an explicit test double").not.toHaveBeenCalled();
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  }
});
