import * as jpeg from "jpeg-js";
import { createLogger } from "./logger";
import type { DetectedObject } from "./workers-ai";

const logger = createLogger("face-blur");

const DEFAULT_BLOCK_SIZE = 12;
const ENCODE_QUALITY = 85;

/**
 * Apply block pixelation to a rectangular region of an RGBA pixel array.
 * Averages each blockSize×blockSize block, producing a mosaic effect.
 * Mutates `pixels` in place.
 */
export function applyBlockPixelation(
  pixels: Uint8Array,
  width: number,
  height: number,
  box: { xmin: number; ymin: number; xmax: number; ymax: number },
  blockSize: number = DEFAULT_BLOCK_SIZE,
): void {
  const x0 = Math.max(0, Math.floor(box.xmin));
  const y0 = Math.max(0, Math.floor(box.ymin));
  const x1 = Math.min(width, Math.ceil(box.xmax));
  const y1 = Math.min(height, Math.ceil(box.ymax));

  if (x0 >= x1 || y0 >= y1) return;

  const stride = width * 4;

  for (let by = y0; by < y1; by += blockSize) {
    for (let bx = x0; bx < x1; bx += blockSize) {
      const blockEndX = Math.min(bx + blockSize, x1);
      const blockEndY = Math.min(by + blockSize, y1);
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;

      for (let py = by; py < blockEndY; py++) {
        for (let px = bx; px < blockEndX; px++) {
          const offset = py * stride + px * 4;
          rSum += pixels[offset];
          gSum += pixels[offset + 1];
          bSum += pixels[offset + 2];
          aSum += pixels[offset + 3];
          count++;
        }
      }

      if (count === 0) continue;

      const rAvg = Math.round(rSum / count);
      const gAvg = Math.round(gSum / count);
      const bAvg = Math.round(bSum / count);
      const aAvg = Math.round(aSum / count);

      for (let py = by; py < blockEndY; py++) {
        for (let px = bx; px < blockEndX; px++) {
          const offset = py * stride + px * 4;
          pixels[offset] = rAvg;
          pixels[offset + 1] = gAvg;
          pixels[offset + 2] = bAvg;
          pixels[offset + 3] = aAvg;
        }
      }
    }
  }
}

/**
 * Blur detected person regions in a JPEG image via block pixelation.
 * Decodes JPEG → pixelates bounding boxes → re-encodes.
 * Returns original buffer on failure (graceful degradation).
 */
export async function blurPersonRegions(
  imageBuffer: ArrayBuffer,
  detections: DetectedObject[],
  blockSize: number = DEFAULT_BLOCK_SIZE,
): Promise<{ buffer: ArrayBuffer; blurredCount: number }> {
  if (detections.length === 0) {
    return { buffer: imageBuffer, blurredCount: 0 };
  }

  try {
    const decoded = jpeg.decode(new Uint8Array(imageBuffer), {
      useTArray: true,
      formatAsRGBA: true,
    });

    const { width, height, data: pixels } = decoded;

    let blurredCount = 0;
    for (const detection of detections) {
      applyBlockPixelation(pixels, width, height, detection.box, blockSize);
      blurredCount++;
    }

    const encoded = jpeg.encode(
      { width, height, data: pixels },
      ENCODE_QUALITY,
    );

    logger.info("Person regions blurred", {
      action: "face_blur_applied",
      metadata: {
        blurredCount,
        imageWidth: width,
        imageHeight: height,
        blockSize,
      },
    });

    // jpeg.encode returns Buffer — extract underlying ArrayBuffer slice
    const resultBuffer = encoded.data.buffer.slice(
      encoded.data.byteOffset,
      encoded.data.byteOffset + encoded.data.byteLength,
    );

    return { buffer: resultBuffer, blurredCount };
  } catch (err) {
    logger.error("Face blur processing failed, returning original", {
      error: {
        name: "FaceBlurError",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return { buffer: imageBuffer, blurredCount: 0 };
  }
}
