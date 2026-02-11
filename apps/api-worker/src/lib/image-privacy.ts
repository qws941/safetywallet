import piexif from "piexifjs";
import { log } from "./observability";

/**
 * EXIF Metadata Stripping for Privacy Protection
 *
 * Removes EXIF metadata from JPEG images to protect user privacy.
 * EXIF data can contain:
 * - GPS coordinates (location)
 * - Camera make/model
 * - Timestamp
 * - Device identifiers
 *
 * Usage:
 *   const stripped = await stripExifMetadata(imageBuffer);
 *   // Upload stripped buffer to R2
 */

/**
 * Strip EXIF metadata from a JPEG image
 *
 * @param imageBuffer - Original image as ArrayBuffer
 * @returns Promise<ArrayBuffer> - Image with EXIF metadata removed
 *
 * Note: This only works with JPEG images. PNG, WebP, GIF have no EXIF data.
 * For non-JPEG images, returns the original buffer unchanged.
 */
export async function stripExifMetadata(
  imageBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  try {
    // Convert ArrayBuffer to base64 data URL for piexifjs
    const uint8Array = new Uint8Array(imageBuffer);
    const binary = Array.from(uint8Array)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    const base64 = btoa(binary);
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // Detect if image has EXIF data
    const exifObj = piexif.load(dataUrl);
    const hasExif = Object.keys(exifObj).some(
      (key) =>
        key !== "thumbnail" && Object.keys(exifObj[key] || {}).length > 0,
    );

    if (!hasExif) {
      log.debug("No EXIF data found in image", {
        action: "exif_strip_skipped",
      });
      return imageBuffer; // No EXIF to remove
    }

    // Remove EXIF data
    const strippedDataUrl = piexif.remove(dataUrl);

    // Convert back to ArrayBuffer
    const base64Data = strippedDataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    log.info("EXIF metadata stripped from image", {
      action: "exif_stripped",
      metadata: {
        originalSize: imageBuffer.byteLength,
        strippedSize: bytes.byteLength,
      },
    });

    return bytes.buffer;
  } catch (err) {
    // If EXIF stripping fails (malformed image, unsupported format),
    // return original and log warning
    log.warn("EXIF stripping failed, returning original image", {
      action: "exif_strip_failed",
      error:
        err instanceof Error
          ? { name: err.name, message: err.message }
          : undefined,
    });
    return imageBuffer;
  }
}

/**
 * Check if a file is a JPEG image based on magic bytes
 *
 * @param buffer - File buffer to check
 * @returns boolean - true if JPEG, false otherwise
 */
export function isJpegImage(buffer: ArrayBuffer): boolean {
  const uint8 = new Uint8Array(buffer);

  // JPEG magic bytes: FF D8 FF
  return (
    uint8.length > 3 &&
    uint8[0] === 0xff &&
    uint8[1] === 0xd8 &&
    uint8[2] === 0xff
  );
}

/**
 * Process uploaded image for privacy:
 * - Strip EXIF metadata if JPEG
 * - Add custom R2 metadata to track privacy processing
 *
 * @param imageBuffer - Original image buffer
 * @param filename - Original filename
 * @returns { buffer: ArrayBuffer; metadata: Record<string, string> }
 */
export async function processImageForPrivacy(
  imageBuffer: ArrayBuffer,
  filename: string,
): Promise<{ buffer: ArrayBuffer; metadata: Record<string, string> }> {
  const isJpeg = isJpegImage(imageBuffer);

  if (!isJpeg) {
    log.debug("Non-JPEG image, skipping EXIF stripping", {
      action: "skip_non_jpeg",
      metadata: { filename },
    });

    return {
      buffer: imageBuffer,
      metadata: {
        "privacy-processed": "false",
        "exif-stripped": "false",
        reason: "non-jpeg",
      },
    };
  }

  const strippedBuffer = await stripExifMetadata(imageBuffer);

  return {
    buffer: strippedBuffer,
    metadata: {
      "privacy-processed": "true",
      "exif-stripped": "true",
      "processed-at": new Date().toISOString(),
      "original-filename": filename,
    },
  };
}
