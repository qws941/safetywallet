/**
 * Client-side image compression using Canvas API.
 * - Resizes images above MAX_DIMENSION and compresses to JPEG.
 * - Strips EXIF metadata from ALL images via canvas redraw (privacy).
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
const JPEG_QUALITY_SMALL = 0.92;
const SMALL_FILE_THRESHOLD = 100 * 1024; // 100KB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Compress an image file using the browser Canvas API.
 * - ALL images are drawn through canvas to strip EXIF metadata (privacy)
 * - Small files (<100KB) use higher quality to minimize quality loss
 * - Large files are resized if dimensions exceed MAX_DIMENSION
 * - Returns original file only for non-images or on canvas failure
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Reject files over 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("이미지 크기는 10MB를 초과할 수 없습니다.");
  }

  const isSmall = file.size < SMALL_FILE_THRESHOLD;

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    if (!isSmall && (width > MAX_DIMENSION || height > MAX_DIMENSION)) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Draw to canvas — this strips EXIF metadata
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const quality = isSmall ? JPEG_QUALITY_SMALL : JPEG_QUALITY;
    const blob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality,
    });

    // Create new File with original name but .jpg extension
    const name = file.name.replace(/\.[^.]+$/, ".jpg");
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // If compression fails for any reason, return original
    return file;
  }
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}
