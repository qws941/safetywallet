import { beforeEach, describe, expect, it, vi } from "vitest";
import { compressImage, compressImages } from "@/lib/image-compress";

type MockBitmap = {
  width: number;
  height: number;
  close: ReturnType<typeof vi.fn>;
};

type MockContext = {
  drawImage: ReturnType<typeof vi.fn>;
};

type MockCanvasInstance = {
  width: number;
  height: number;
  getContext: ReturnType<
    typeof vi.fn<(contextId: string) => MockContext | null>
  >;
  convertToBlob: ReturnType<
    typeof vi.fn<(options: { type: string; quality: number }) => Promise<Blob>>
  >;
};

const createImageBitmapMock = vi.fn<(file: File) => Promise<MockBitmap>>();
const drawImageMock = vi.fn();
const convertToBlobMock =
  vi.fn<(options: { type: string; quality: number }) => Promise<Blob>>();
const createdCanvases: MockCanvasInstance[] = [];

class MockOffscreenCanvas {
  width: number;
  height: number;
  getContext = vi.fn<(contextId: string) => MockContext | null>(() => ({
    drawImage: drawImageMock,
  }));
  convertToBlob = convertToBlobMock;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    createdCanvases.push(this);
  }
}

const makeFile = (name: string, type: string, size: number): File => {
  return new File([new Uint8Array(size)], name, { type });
};

beforeEach(() => {
  vi.clearAllMocks();
  createdCanvases.length = 0;
  convertToBlobMock.mockResolvedValue(
    new Blob(["compressed"], { type: "image/jpeg" }),
  );
  createImageBitmapMock.mockResolvedValue({
    width: 1200,
    height: 800,
    close: vi.fn(),
  });
  vi.stubGlobal("createImageBitmap", createImageBitmapMock);
  vi.stubGlobal("OffscreenCanvas", MockOffscreenCanvas);
});

describe("compressImage", () => {
  it("returns original file when file is not an image", async () => {
    const file = makeFile("note.txt", "text/plain", 1024);

    const result = await compressImage(file);

    expect(result).toBe(file);
    expect(createImageBitmapMock).not.toHaveBeenCalled();
  });

  it("throws when image size is over 10MB", async () => {
    const file = makeFile("huge.png", "image/png", 10 * 1024 * 1024 + 1);

    await expect(compressImage(file)).rejects.toThrow(
      "이미지 크기는 10MB를 초과할 수 없습니다.",
    );
    expect(createImageBitmapMock).not.toHaveBeenCalled();
  });

  it("uses quality 0.92 for small images under 100KB", async () => {
    const file = makeFile("small.png", "image/png", 80 * 1024);

    const result = await compressImage(file);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("small.jpg");
    expect(convertToBlobMock).toHaveBeenCalledWith({
      type: "image/jpeg",
      quality: 0.92,
    });
    expect(drawImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1200, height: 800 }),
      0,
      0,
      1200,
      800,
    );
  });

  it("uses quality 0.8 for large images", async () => {
    const file = makeFile("large.png", "image/png", 300 * 1024);

    await compressImage(file);

    expect(convertToBlobMock).toHaveBeenCalledWith({
      type: "image/jpeg",
      quality: 0.8,
    });
  });

  it("resizes images over max dimension proportionally", async () => {
    const file = makeFile("wide.png", "image/png", 250 * 1024);
    const close = vi.fn();
    createImageBitmapMock.mockResolvedValueOnce({
      width: 4000,
      height: 2000,
      close,
    });

    await compressImage(file);

    expect(createdCanvases).toHaveLength(1);
    expect(createdCanvases[0]?.width).toBe(1920);
    expect(createdCanvases[0]?.height).toBe(960);
    expect(drawImageMock).toHaveBeenCalledWith(
      expect.objectContaining({ width: 4000, height: 2000 }),
      0,
      0,
      1920,
      960,
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("returns original file on canvas error", async () => {
    const file = makeFile("broken.png", "image/png", 200 * 1024);
    convertToBlobMock.mockRejectedValueOnce(new Error("canvas failure"));

    const result = await compressImage(file);

    expect(result).toBe(file);
  });

  it("returns original file when canvas context is missing", async () => {
    const file = makeFile("no-context.png", "image/png", 200 * 1024);
    const close = vi.fn();
    createImageBitmapMock.mockResolvedValueOnce({
      width: 1600,
      height: 1200,
      close,
    });

    class NullContextCanvas {
      getContext = vi.fn<(contextId: string) => MockContext | null>(() => null);
      convertToBlob =
        vi.fn<(options: { type: string; quality: number }) => Promise<Blob>>();

      constructor(
        public width: number,
        public height: number,
      ) {
        void width;
        void height;
      }
    }

    vi.stubGlobal("OffscreenCanvas", NullContextCanvas);

    const result = await compressImage(file);

    expect(result).toBe(file);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("compressImages", () => {
  it("processes an array of files and returns compressed results", async () => {
    const png = makeFile("photo.png", "image/png", 220 * 1024);
    const text = makeFile("readme.txt", "text/plain", 128);

    const results = await compressImages([png, text]);

    expect(results).toHaveLength(2);
    expect(results[0]?.type).toBe("image/jpeg");
    expect(results[0]?.name).toBe("photo.jpg");
    expect(results[1]).toBe(text);
  });
});
