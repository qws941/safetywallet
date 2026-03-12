export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

function isAllowedMimeType(
  type: string,
): type is (typeof ALLOWED_MIME_TYPES)[number] {
  return ALLOWED_MIME_TYPES.includes(
    type as (typeof ALLOWED_MIME_TYPES)[number],
  );
}

export function detectFileType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  const header = bytes.subarray(0, 16);

  if (header.length < 3) {
    return null;
  }

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    header.length >= 4 &&
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38
  ) {
    return "image/gif";
  }

  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "image/webp";
  }

  if (
    header.length >= 12 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    const brand = String.fromCharCode(
      header[8],
      header[9],
      header[10],
      header[11],
    );

    if (brand === "heic") {
      return "image/heic";
    }

    if (brand === "heif" || brand === "mif1") {
      return "image/heif";
    }

    if (brand === "qt  ") {
      return "video/quicktime";
    }

    return "video/mp4";
  }

  return null;
}

export function validateFileType(buffer: ArrayBuffer): {
  valid: boolean;
  detectedType: string | null;
} {
  const detectedType = detectFileType(buffer);
  const valid = detectedType !== null && isAllowedMimeType(detectedType);

  return { valid, detectedType };
}

export function validateUploadedFile(
  buffer: ArrayBuffer,
  claimedType: string,
): {
  valid: boolean;
  detectedType: string;
  reason?: string;
} {
  const detectedType = detectFileType(buffer);

  if (!detectedType) {
    return {
      valid: false,
      detectedType: "unknown",
      reason: "Unable to detect file type from signature",
    };
  }

  if (!isAllowedMimeType(detectedType)) {
    return {
      valid: false,
      detectedType,
      reason: "Detected file type is not allowed",
    };
  }

  if (claimedType && claimedType !== detectedType) {
    return {
      valid: true,
      detectedType,
      reason: `Claimed MIME type ${claimedType} does not match detected ${detectedType}`,
    };
  }

  return {
    valid: true,
    detectedType,
  };
}
