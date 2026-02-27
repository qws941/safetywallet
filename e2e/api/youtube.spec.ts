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
  test.describe.configure({ timeout: 90_000 });
  let loginAccessToken: string;

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90_000);
    // Get valid worker token for auth testing (with 429 retry)
    let response = await request.post("./auth/login", {
      data: WORKER_LOGIN_DATA,
    });

    if (response.status() === 429) {
      const retryAfter = Number(response.headers()["retry-after"] || "60");
      await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
      response = await request.post("./auth/login", {
        data: WORKER_LOGIN_DATA,
      });
    }

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
    test.skip(
      !loginAccessToken,
      "Login failed — attendance gate or rate limit",
    );
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
    test.skip(
      !loginAccessToken,
      "Login failed — attendance gate or rate limit",
    );
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
    test.skip(
      !loginAccessToken,
      "Login failed — attendance gate or rate limit",
    );
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
