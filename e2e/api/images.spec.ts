import { test, expect } from "@playwright/test";
import { workerLogin, WorkerRateLimitError } from "../worker-app/helpers";

test.describe("Images API", () => {
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post("/api/auth/login", {
      data: {
        phone: "01076015830",
        name: "김선민",
        socialNo: "990308",
      },
    });
    if (loginRes.ok()) {
      const data = await loginRes.json();
      accessToken = data.data?.accessToken;
    }
  });
  test("should handle valid image upload request", async ({ request }) => {
    if (!accessToken) {
      test.skip(true, "Authentication skipped/failed");
    }

    const tinyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==",
      "base64",
    );
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([tinyPng], { type: "image/png" }),
      "test.png",
    );

    const res = await request.post("/api/images/upload", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      multipart: {
        file: {
          name: "test.png",
          mimeType: "image/png",
          buffer: tinyPng,
        },
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("imageId");
    expect(body.data).toHaveProperty("url");
  });
});
