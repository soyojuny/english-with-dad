import { beforeEach, expect, test, vi } from "vitest";
import { readQrValueFromSource } from "../../lib/qr-reader";

const decode = vi.hoisted(() => vi.fn());
vi.mock("jsqr", () => ({ default: decode }));

beforeEach(() => { decode.mockReset(); });

test.each([[0, 10], [10, 0], [0, 0]])("M02: %i×%i source returns null without reading canvas", (width, height) => {
  // Given
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
  // When
  const result = readQrValueFromSource(document.createElement("canvas"), width, height);
  // Then
  expect(result).toBeNull();
  expect(getContext).not.toHaveBeenCalled();
  expect(decode).not.toHaveBeenCalled();
});

test("M02: missing canvas context returns null without decoding", () => {
  // Given
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  // When
  const result = readQrValueFromSource(document.createElement("canvas"), 10, 10);
  // Then
  expect(result).toBeNull();
  expect(decode).not.toHaveBeenCalled();
});

test.each([
  ["detected text is trimmed", { data: "  test value  " }, "test value"],
  ["no QR returns null", null, null],
  ["whitespace payload stays an empty string", { data: "   " }, ""],
])("M02: %s", (_name, decoded, expected) => {
  // Given
  const source = document.createElement("canvas");
  const pixels = new Uint8ClampedArray(16);
  const context = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: pixels, width: 2, height: 2 })) };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  decode.mockReturnValue(decoded);
  // When
  const result = readQrValueFromSource(source, 2, 2);
  // Then
  expect(result).toBe(expected);
  expect(context.drawImage).toHaveBeenCalledWith(source, 0, 0, 2, 2);
  expect(decode).toHaveBeenCalledExactlyOnceWith(pixels, 2, 2, { inversionAttempts: "attemptBoth" });
});
