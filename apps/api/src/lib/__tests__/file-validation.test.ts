import { describe, expect, it } from "vitest";
import {
  ALLOWED_MIME_TYPES,
  detectFileType,
  validateFileType,
  validateUploadedFile,
} from "../file-validation";

function toBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe("file-validation", () => {
  describe("detectFileType", () => {
    it("detects JPEG from magic bytes", () => {
      const buffer = toBuffer([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectFileType(buffer)).toBe("image/jpeg");
    });

    it("detects PNG from signature", () => {
      const buffer = toBuffer([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
      ]);
      expect(detectFileType(buffer)).toBe("image/png");
    });

    it("detects GIF from signature", () => {
      const buffer = toBuffer([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(detectFileType(buffer)).toBe("image/gif");
    });

    it("detects WebP with WEBP marker at offset 8", () => {
      const buffer = toBuffer([
        0x52, 0x49, 0x46, 0x46, 0x11, 0x22, 0x33, 0x44, 0x57, 0x45, 0x42, 0x50,
        0x56, 0x50,
      ]);
      expect(detectFileType(buffer)).toBe("image/webp");
    });

    it("detects MP4 via ftyp at offset 4", () => {
      const buffer = toBuffer([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      expect(detectFileType(buffer)).toBe("video/mp4");
    });

    it("detects MOV via quicktime brand", () => {
      const buffer = toBuffer([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20,
      ]);
      expect(detectFileType(buffer)).toBe("video/quicktime");
    });

    it("detects HEIC via heic brand", () => {
      const buffer = toBuffer([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
      ]);
      expect(detectFileType(buffer)).toBe("image/heic");
    });

    it("detects HEIF via heif brand", () => {
      const buffer = toBuffer([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66,
      ]);
      expect(detectFileType(buffer)).toBe("image/heif");
    });

    it("detects HEIF via mif1 brand", () => {
      const buffer = toBuffer([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31,
      ]);
      expect(detectFileType(buffer)).toBe("image/heif");
    });

    it("returns null for unsupported EXE signature", () => {
      const buffer = toBuffer([0x4d, 0x5a, 0x90, 0x00]);
      expect(detectFileType(buffer)).toBeNull();
    });

    it("returns null for unsupported PDF signature", () => {
      const buffer = toBuffer([0x25, 0x50, 0x44, 0x46]);
      expect(detectFileType(buffer)).toBeNull();
    });

    it("returns null for empty and too-small buffers", () => {
      expect(detectFileType(new ArrayBuffer(0))).toBeNull();
      expect(detectFileType(toBuffer([0xff, 0xd8]))).toBeNull();
    });
  });

  describe("validateFileType", () => {
    it("returns valid true for allowed image types", () => {
      const pngBuffer = toBuffer([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      expect(validateFileType(pngBuffer)).toEqual({
        valid: true,
        detectedType: "image/png",
      });
    });

    it("returns valid false for detected but disallowed types", () => {
      const mp4Buffer = toBuffer([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      expect(validateFileType(mp4Buffer)).toEqual({
        valid: false,
        detectedType: "video/mp4",
      });
    });
  });

  describe("validateUploadedFile", () => {
    it("accepts valid detected image type", () => {
      const jpegBuffer = toBuffer([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x00]);
      expect(validateUploadedFile(jpegBuffer, "image/jpeg")).toEqual({
        valid: true,
        detectedType: "image/jpeg",
      });
    });

    it("rejects unsupported detected type", () => {
      const mp4Buffer = toBuffer([
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]);
      expect(validateUploadedFile(mp4Buffer, "image/png")).toEqual({
        valid: false,
        detectedType: "video/mp4",
        reason: "Detected file type is not allowed",
      });
    });

    it("rejects unknown signatures", () => {
      const exeBuffer = toBuffer([0x4d, 0x5a, 0x90, 0x00]);
      expect(validateUploadedFile(exeBuffer, "image/jpeg")).toEqual({
        valid: false,
        detectedType: "unknown",
        reason: "Unable to detect file type from signature",
      });
    });

    it("keeps valid true when claimed and detected type mismatch", () => {
      const pngBuffer = toBuffer([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      const result = validateUploadedFile(pngBuffer, "image/jpeg");

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe("image/png");
      expect(result.reason).toContain("does not match detected image/png");
    });
  });

  it("keeps allowed MIME type list aligned with route policy", () => {
    expect(ALLOWED_MIME_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
  });
});
