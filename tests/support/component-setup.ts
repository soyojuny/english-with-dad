import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import "./common-setup";

let blockedXHR: ReturnType<typeof vi.fn>;

beforeEach(() => {
  blockedXHR = vi.fn(function () {
    throw new Error("Unexpected XMLHttpRequest: use an explicit test double");
  });
  vi.stubGlobal("XMLHttpRequest", blockedXHR);
});

afterEach(() => {
  try {
    cleanup();
    expect(blockedXHR, "Unexpected XMLHttpRequest").not.toHaveBeenCalled();
  } finally {
    localStorage.clear();
    sessionStorage.clear();
  }
});
