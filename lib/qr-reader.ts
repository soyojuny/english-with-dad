import jsQR from "jsqr";

function drawQrSourceToCanvas(source: CanvasImageSource, width: number, height: number) {
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

export function readQrValueFromSource(source: CanvasImageSource, width: number, height: number) {
  const imageData = drawQrSourceToCanvas(source, width, height);
  if (!imageData) return null;
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data?.trim() ?? null;
}
