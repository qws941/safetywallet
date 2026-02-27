import { test, expect } from "@playwright/test";

const ADMIN_ORIGIN = new URL(
  process.env.ADMIN_APP_URL ?? "https://admin.safetywallet.jclee.me",
).origin;

const WORKER_LOGIN_DATA = {
  name: process.env.E2E_WORKER_NAME ?? "김선민",
  phone: process.env.E2E_WORKER_PHONE ?? "01076015830",
  dob: process.env.E2E_WORKER_DOB ?? "990308",
};

test.describe("YouTube oEmbed Endpoints", () => {
  let loginAccessToken: string;

  test.beforeAll(async ({ request }) => {
    // Get valid worker token for auth testing
    const response = await request.post("./auth/login", {
      data: WORKER_LOGIN_DATA,
    });

    if (response.status() === 200) {
      const body = await response.json();
      loginAccessToken = body.data.accessToken;
    }
  });

  test("GET /education/youtube-oembed returns 401 without auth", async ({
    request,
  }) => {
    const res = await request.get(
      "./education/youtube-oembed?url=https://youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(res.status()).toBe(401);
  });

  test("GET /education/youtube-oembed returns 400 without url param", async ({
    request,
  }) => {
    const res = await request.get("./education/youtube-oembed", {
      headers: { Authorization: `Bearer ${loginAccessToken}` },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("MISSING_URL");
  });

  test("GET /education/youtube-oembed returns 400 with invalid url", async ({
    request,
  }) => {
    const res = await request.get(
      "./education/youtube-oembed?url=https://example.com/video",
      {
        headers: { Authorization: `Bearer ${loginAccessToken}` },
      },
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_YOUTUBE_URL");
  });

  test("GET /education/youtube-oembed successfully parses various YouTube URL formats", async ({
    request,
  }) => {
    // Use a reliable, long-lived YouTube video (e.g., first YouTube video "Me at the zoo")
    const testVideoId = "jNQXAC9IVRw";

    const validUrls = [
      `https://www.youtube.com/watch?v=${testVideoId}`,
      `https://youtu.be/${testVideoId}`,
      `https://www.youtube.com/embed/${testVideoId}`,
    ];

    for (const url of validUrls) {
      const res = await request.get(
        `./education/youtube-oembed?url=${encodeURIComponent(url)}`,
        {
          headers: { Authorization: `Bearer ${loginAccessToken}` },
        },
      );

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.videoId).toBe(testVideoId);
      expect(body.data).toHaveProperty("title");
      expect(body.data).toHaveProperty("thumbnailUrl");
    }
  });
});
