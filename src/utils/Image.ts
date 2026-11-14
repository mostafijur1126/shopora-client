/**
 * Client-side image processing for admin uploads.
 * Phone photos are often 3-10 MB. Before they reach the server (or the database)
 * we resize them to at most 1200px and re-encode them, which usually gives 80-200 KB.
 */

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  name: string;
}

const MAX_SIDE = 1200;
const QUALITY = 0.82;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This file could not be read as an image."));
    };
    img.src = url;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Could not read the processed image."));
    reader.readAsDataURL(blob);
  });

export async function compressImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error(
      `${file.name}: please choose an image file (JPG, PNG, WEBP).`,
    );
  }

  const img = await loadImage(file);
  const scale = Math.min(
    1,
    MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight),
  );
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot process images.");

  // White background so transparent PNGs do not turn black
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, "image/webp", QUALITY);
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
    ext = "jpg";
  }
  if (!blob) throw new Error("Could not compress this image.");

  return {
    blob,
    dataUrl: await blobToDataUrl(blob),
    name: `${file.name.replace(/\.[^.]+$/, "") || "product"}.${ext}`,
  };
}
