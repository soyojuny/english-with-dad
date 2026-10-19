import { beforeEach, expect, test, vi } from "vitest";
import { compressCoverImage } from "../../lib/cover-image";

let dimensions: [number, number];
let loadFails: boolean;
let context: { fillStyle: string; fillRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };
let revoke: ReturnType<typeof vi.fn<(url: string) => void>>;
let create: ReturnType<typeof vi.fn<(file: Blob | MediaSource) => string>>;

beforeEach(() => {
  dimensions = [1920, 960];
  loadFails = false;
  context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  revoke = vi.fn<(url: string) => void>();
  create = vi.fn<(file: Blob | MediaSource) => string>(() => "blob:synthetic-cover");
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = create;
    static revokeObjectURL = revoke;
  });
  vi.stubGlobal("Image", class extends EventTarget {
    naturalWidth = dimensions[0];
    naturalHeight = dimensions[1];
    set src(_value: string) {
      queueMicrotask(() => this.dispatchEvent(new Event(loadFails ? "error" : "load")));
    }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,fixture");
});

test.each([
  ["landscape", 1920, 960, 960, 480],
  ["portrait", 480, 1920, 240, 960],
  ["square", 1920, 1920, 960, 960],
  ["small image is not enlarged", 320, 160, 320, 160],
  ["exact size limit", 960, 480, 960, 480],
])("M01: %s uses bounded dimensions and a white JPEG background", async (_name, width, height, expectedWidth, expectedHeight) => {
  // Given
  dimensions = [width, height];
  const file = new File(["synthetic"], "cover.png", { type: "image/png" });
  // When
  const result = await compressCoverImage(file);
  // Then
  expect(result).toBe("data:image/jpeg;base64,fixture");
  expect(context.fillStyle).toBe("#ffffff");
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, expectedWidth, expectedHeight);
  expect(context.drawImage).toHaveBeenCalledWith(expect.any(EventTarget), 0, 0, expectedWidth, expectedHeight);
  const canvas = vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.contexts[0] as HTMLCanvasElement;
  expect([canvas.width, canvas.height]).toEqual([expectedWidth, expectedHeight]);
  expect(canvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.72);
  expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:synthetic-cover");
});

test("M01: non-image input is rejected before allocating an object URL", async () => {
  // Given
  const file = new File(["text"], "cover.txt", { type: "text/plain" });
  // When
  const result = compressCoverImage(file);
  // Then
  await expect(result).rejects.toThrow("이미지 파일만 업로드할 수 있습니다.");
  expect(create).not.toHaveBeenCalled();
  expect(revoke).not.toHaveBeenCalled();
});

test("M01: failed image load rejects and releases its object URL", async () => {
  // Given
  loadFails = true;
  // When
  const result = compressCoverImage(new File(["broken"], "cover.png", { type: "image/png" }));
  // Then
  await expect(result).rejects.toThrow("표지 이미지를 읽지 못했습니다.");
  expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:synthetic-cover");
  expect(context.drawImage).not.toHaveBeenCalled();
});

test("M01: unavailable canvas rejects after releasing the image URL", async () => {
  // Given
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  // When
  const result = compressCoverImage(new File(["image"], "cover.png", { type: "image/png" }));
  // Then
  await expect(result).rejects.toThrow("표지 이미지를 처리하지 못했습니다.");
  expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:synthetic-cover");
});
