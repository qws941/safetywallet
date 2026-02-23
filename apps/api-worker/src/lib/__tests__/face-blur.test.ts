import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectedObject } from "../workers-ai";

const {
  decodeMock,
  encodeMock,
  loggerInfoMock,
  loggerErrorMock,
  loggerWarnMock,
  loggerDebugMock,
} = vi.hoisted(() => ({
  decodeMock: vi.fn(),
  encodeMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  loggerDebugMock: vi.fn(),
}));

vi.mock("jpeg-js", () => ({
  decode: decodeMock,
  encode: encodeMock,
}));

vi.mock("../logger", () => ({
  createLogger: () => ({
    info: loggerInfoMock,
    error: loggerErrorMock,
    warn: loggerWarnMock,
    debug: loggerDebugMock,
  }),
}));

vi.mock("../workers-ai", () => ({}));

import { applyBlockPixelation, blurPersonRegions } from "../face-blur";

function pixel(
  r: number,
  g: number,
  b: number,
  a: number,
): [number, number, number, number] {
  return [r, g, b, a];
}

function makePixels(
  pixels: Array<[number, number, number, number]>,
): Uint8Array {
  return new Uint8Array(pixels.flat());
}

describe("face-blur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyBlockPixelation", () => {
    it("pixelates a normal region and mutates in place", () => {
      const pixels = makePixels([
        pixel(10, 20, 30, 40),
        pixel(30, 40, 50, 60),
        pixel(50, 60, 70, 80),
        pixel(70, 80, 90, 100),
      ]);

      applyBlockPixelation(
        pixels,
        2,
        2,
        { xmin: 0, ymin: 0, xmax: 2, ymax: 2 },
        2,
      );

      expect(Array.from(pixels)).toEqual([
        40, 50, 60, 70, 40, 50, 60, 70, 40, 50, 60, 70, 40, 50, 60, 70,
      ]);
    });

    it("clamps out-of-bounds box coordinates to image bounds", () => {
      const pixels = makePixels([
        pixel(1, 2, 3, 4),
        pixel(5, 6, 7, 8),
        pixel(9, 10, 11, 12),
        pixel(13, 14, 15, 16),
      ]);

      applyBlockPixelation(
        pixels,
        2,
        2,
        { xmin: -100, ymin: -100, xmax: 100, ymax: 100 },
        2,
      );

      expect(Array.from(pixels)).toEqual([
        7, 8, 9, 10, 7, 8, 9, 10, 7, 8, 9, 10, 7, 8, 9, 10,
      ]);
    });

    it("handles a box larger than the image by processing available pixels", () => {
      const pixels = makePixels([
        pixel(0, 0, 0, 255),
        pixel(100, 100, 100, 255),
        pixel(200, 200, 200, 255),
      ]);

      applyBlockPixelation(
        pixels,
        3,
        1,
        { xmin: 0, ymin: 0, xmax: 9999, ymax: 9999 },
        64,
      );

      expect(Array.from(pixels)).toEqual([
        100, 100, 100, 255, 100, 100, 100, 255, 100, 100, 100, 255,
      ]);
    });

    it("returns early when box has zero or negative size", () => {
      const original = makePixels([pixel(1, 1, 1, 1), pixel(2, 2, 2, 2)]);
      const pixels = new Uint8Array(original);

      applyBlockPixelation(
        pixels,
        2,
        1,
        { xmin: 1.2, ymin: 0, xmax: 1.0, ymax: 1 },
        4,
      );

      expect(Array.from(pixels)).toEqual(Array.from(original));
    });

    it("supports single-pixel box without changing pixel value", () => {
      const original = makePixels([pixel(123, 45, 67, 89)]);
      const pixels = new Uint8Array(original);

      applyBlockPixelation(
        pixels,
        1,
        1,
        { xmin: 0, ymin: 0, xmax: 1, ymax: 1 },
        8,
      );

      expect(Array.from(pixels)).toEqual([123, 45, 67, 89]);
    });

    it("uses default block size 12 when blockSize is omitted", () => {
      const source = Array.from({ length: 13 }, (_, i) =>
        pixel(i * 10, 0, 0, 255),
      );
      const pixels = makePixels(source);

      applyBlockPixelation(pixels, 13, 1, {
        xmin: 0,
        ymin: 0,
        xmax: 13,
        ymax: 1,
      });

      const expectedFirstBlock = Math.round(
        source.slice(0, 12).reduce((sum, p) => sum + p[0], 0) / 12,
      );

      for (let i = 0; i < 12; i++) {
        const offset = i * 4;
        expect(pixels[offset]).toBe(expectedFirstBlock);
        expect(pixels[offset + 1]).toBe(0);
        expect(pixels[offset + 2]).toBe(0);
        expect(pixels[offset + 3]).toBe(255);
      }

      const lastOffset = 12 * 4;
      expect(pixels[lastOffset]).toBe(120);
      expect(pixels[lastOffset + 1]).toBe(0);
      expect(pixels[lastOffset + 2]).toBe(0);
      expect(pixels[lastOffset + 3]).toBe(255);
    });

    it("supports blockSize=1 edge case (no visual change)", () => {
      const original = makePixels([
        pixel(2, 4, 6, 8),
        pixel(10, 12, 14, 16),
        pixel(18, 20, 22, 24),
        pixel(26, 28, 30, 32),
      ]);
      const pixels = new Uint8Array(original);

      applyBlockPixelation(
        pixels,
        2,
        2,
        { xmin: 0, ymin: 0, xmax: 2, ymax: 2 },
        1,
      );

      expect(Array.from(pixels)).toEqual(Array.from(original));
    });

    it("uses width*4 stride so processing one row does not leak across rows", () => {
      const pixels = makePixels([
        pixel(10, 10, 10, 255),
        pixel(20, 20, 20, 255),
        pixel(30, 30, 30, 255),
        pixel(100, 0, 0, 255),
        pixel(200, 0, 0, 255),
        pixel(30, 30, 30, 255),
      ]);

      applyBlockPixelation(
        pixels,
        3,
        2,
        { xmin: 0, ymin: 1, xmax: 2, ymax: 2 },
        2,
      );

      expect(Array.from(pixels)).toEqual([
        10, 10, 10, 255, 20, 20, 20, 255, 30, 30, 30, 255, 150, 0, 0, 255, 150,
        0, 0, 255, 30, 30, 30, 255,
      ]);
    });

    it("handles non-finite blockSize causing zero-count branch", () => {
      const original = makePixels([pixel(9, 9, 9, 9), pixel(8, 8, 8, 8)]);
      const pixels = new Uint8Array(original);

      applyBlockPixelation(
        pixels,
        2,
        1,
        { xmin: 0, ymin: 0, xmax: 2, ymax: 1 },
        Number.NaN,
      );

      expect(Array.from(pixels)).toEqual(Array.from(original));
    });
  });

  describe("blurPersonRegions", () => {
    it("returns original buffer and zero count when detections are empty", async () => {
      const imageBuffer = new Uint8Array([1, 2, 3]).buffer;

      const result = await blurPersonRegions(imageBuffer, []);

      expect(result).toEqual({ buffer: imageBuffer, blurredCount: 0 });
      expect(decodeMock).not.toHaveBeenCalled();
      expect(encodeMock).not.toHaveBeenCalled();
    });

    it("blurs a single detection and encodes with default quality 85", async () => {
      const imageBuffer = new Uint8Array([255, 216, 255]).buffer;
      const decodedPixels = makePixels([
        pixel(10, 20, 30, 40),
        pixel(30, 40, 50, 60),
        pixel(50, 60, 70, 80),
        pixel(70, 80, 90, 100),
      ]);

      decodeMock.mockReturnValue({
        width: 2,
        height: 2,
        data: decodedPixels,
      });

      const encodedRaw = new Uint8Array([0, 1, 2, 3, 4, 5]);
      const encodedData = encodedRaw.subarray(1, 5);
      encodeMock.mockReturnValue({ data: encodedData });

      const detections: DetectedObject[] = [
        {
          label: "person",
          score: 0.99,
          box: { xmin: 0, ymin: 0, xmax: 2, ymax: 2 },
        },
      ];

      const result = await blurPersonRegions(imageBuffer, detections);

      expect(decodeMock).toHaveBeenCalledWith(new Uint8Array(imageBuffer), {
        useTArray: true,
        formatAsRGBA: true,
      });

      expect(encodeMock).toHaveBeenCalledTimes(1);
      expect(encodeMock).toHaveBeenCalledWith(
        {
          width: 2,
          height: 2,
          data: decodedPixels,
        },
        85,
      );

      expect(result.blurredCount).toBe(1);
      expect(Array.from(new Uint8Array(result.buffer))).toEqual([1, 2, 3, 4]);
      expect(Array.from(decodedPixels)).toEqual([
        40, 50, 60, 70, 40, 50, 60, 70, 40, 50, 60, 70, 40, 50, 60, 70,
      ]);
      expect(loggerInfoMock).toHaveBeenCalledWith("Person regions blurred", {
        action: "face_blur_applied",
        metadata: {
          blurredCount: 1,
          imageWidth: 2,
          imageHeight: 2,
          blockSize: 12,
        },
      });
    });

    it("processes multiple detections and returns blurredCount per detection", async () => {
      const imageBuffer = new Uint8Array([9, 9, 9]).buffer;
      const decodedPixels = makePixels([
        pixel(0, 0, 0, 255),
        pixel(100, 0, 0, 255),
        pixel(0, 100, 0, 255),
        pixel(0, 0, 100, 255),
      ]);

      decodeMock.mockReturnValue({
        width: 2,
        height: 2,
        data: decodedPixels,
      });
      encodeMock.mockReturnValue({ data: new Uint8Array([7, 7, 7]) });

      const detections: DetectedObject[] = [
        {
          label: "person",
          score: 0.8,
          box: { xmin: 0, ymin: 0, xmax: 1, ymax: 1 },
        },
        {
          label: "face",
          score: 0.9,
          box: { xmin: 0, ymin: 0, xmax: 2, ymax: 2 },
        },
      ];

      const result = await blurPersonRegions(imageBuffer, detections, 2);

      expect(result.blurredCount).toBe(2);
      expect(decodeMock).toHaveBeenCalledTimes(1);
      expect(encodeMock).toHaveBeenCalledTimes(1);
      expect(loggerInfoMock).toHaveBeenCalledWith("Person regions blurred", {
        action: "face_blur_applied",
        metadata: {
          blurredCount: 2,
          imageWidth: 2,
          imageHeight: 2,
          blockSize: 2,
        },
      });
    });

    it("returns original buffer gracefully when decode throws", async () => {
      const imageBuffer = new Uint8Array([5, 4, 3, 2, 1]).buffer;
      const decodeError = new Error("decode failed");
      decodeMock.mockImplementation(() => {
        throw decodeError;
      });

      const detections: DetectedObject[] = [
        {
          label: "person",
          score: 0.7,
          box: { xmin: 0, ymin: 0, xmax: 1, ymax: 1 },
        },
      ];

      const result = await blurPersonRegions(imageBuffer, detections, 4);

      expect(result).toEqual({ buffer: imageBuffer, blurredCount: 0 });
      expect(encodeMock).not.toHaveBeenCalled();
      expect(loggerErrorMock).toHaveBeenCalledWith(
        "Face blur processing failed, returning original",
        {
          error: {
            name: "FaceBlurError",
            message: "decode failed",
          },
        },
      );
    });

    it("converts non-Error thrown values to strings in error logging", async () => {
      const imageBuffer = new Uint8Array([1]).buffer;
      decodeMock.mockImplementation(() => {
        throw "bad decode";
      });

      const detections: DetectedObject[] = [
        {
          label: "person",
          score: 0.7,
          box: { xmin: 0, ymin: 0, xmax: 1, ymax: 1 },
        },
      ];

      const result = await blurPersonRegions(imageBuffer, detections);

      expect(result).toEqual({ buffer: imageBuffer, blurredCount: 0 });
      expect(loggerErrorMock).toHaveBeenCalledWith(
        "Face blur processing failed, returning original",
        {
          error: {
            name: "FaceBlurError",
            message: "bad decode",
          },
        },
      );
    });
  });
});
