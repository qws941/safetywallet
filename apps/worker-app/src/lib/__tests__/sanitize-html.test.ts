import { render, screen } from "@testing-library/react";
import { Fragment, createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasHtmlContent,
  renderSanitizedAnnouncementHtml,
  sanitizeAnnouncementHtml,
} from "@/lib/sanitize-html";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sanitizeAnnouncementHtml", () => {
  it("keeps allowed tags and sanitizes anchor/image attributes", () => {
    const raw = [
      "<p>안전 <strong>중요</strong> <em>공지</em></p>",
      "<ul><li>항목</li></ul>",
      "<blockquote><code>code</code><pre>pre</pre></blockquote>",
      '<a href="https://example.com" class="link" data-id="1">링크</a>',
      '<img src="/r2/images/a.jpg" alt="이미지" width="100" onerror="alert(1)" />',
    ].join("");

    const sanitized = sanitizeAnnouncementHtml(raw);

    expect(sanitized).toContain(
      "<p>안전 <strong>중요</strong> <em>공지</em></p>",
    );
    expect(sanitized).toContain("<ul><li>항목</li></ul>");
    expect(sanitized).toContain(
      "<blockquote><code>code</code><pre>pre</pre></blockquote>",
    );
    expect(sanitized).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">링크</a>',
    );
    expect(sanitized).toContain('<img src="/r2/images/a.jpg" alt="이미지">');
    expect(sanitized).not.toContain("data-id");
    expect(sanitized).not.toContain("width=");
    expect(sanitized).not.toContain("onerror");
  });

  it("strips disallowed tags and dangerous attributes", () => {
    const raw =
      '<div style="color:red"><span onclick="evil()">텍스트</span><script>alert(1)</script><iframe src="https://bad.example"></iframe></div>';

    const sanitized = sanitizeAnnouncementHtml(raw);

    expect(sanitized).toContain("텍스트");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<iframe");
    expect(sanitized).not.toContain("<div");
    expect(sanitized).not.toContain("<span");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("style=");
  });

  it("removes javascript URLs from anchors and images", () => {
    const raw =
      '<p><a href="javascript:alert(1)">나쁜 링크</a><img src="javascript:alert(2)" alt="bad" /></p>';

    const sanitized = sanitizeAnnouncementHtml(raw);

    expect(sanitized).toContain(
      '<a target="_blank" rel="noopener noreferrer">나쁜 링크</a>',
    );
    expect(sanitized).toContain('<img alt="bad">');
    expect(sanitized).not.toContain("javascript:");
  });

  it("allows image src for http and https", () => {
    const raw =
      '<p><img src="http://cdn.example/a.jpg" alt="a" /><img src="https://cdn.example/b.jpg" alt="b" /></p>';

    const sanitized = sanitizeAnnouncementHtml(raw);

    expect(sanitized).toContain('<img src="http://cdn.example/a.jpg" alt="a">');
    expect(sanitized).toContain(
      '<img src="https://cdn.example/b.jpg" alt="b">',
    );
  });

  it("returns empty string for empty and null-like input", () => {
    const invokeSanitizer = (value: unknown) => {
      const fn = sanitizeAnnouncementHtml as (input: unknown) => string;
      return fn(value);
    };

    expect(sanitizeAnnouncementHtml("")).toBe("");
    expect(invokeSanitizer(null)).toBe("");
  });
});

describe("hasHtmlContent", () => {
  it("returns true when string has HTML tags", () => {
    expect(hasHtmlContent("<p>내용</p>")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasHtmlContent("그냥 텍스트입니다.")).toBe(false);
  });
});

describe("renderSanitizedAnnouncementHtml", () => {
  it("returns renderable React elements from sanitized HTML", () => {
    const raw =
      '<p>공지 <a href="https://example.com">링크</a></p><img src="/r2/images/photo.jpg" alt="photo" />';

    const nodes = renderSanitizedAnnouncementHtml(raw);

    render(createElement(Fragment, null, nodes));

    expect(screen.getByText("공지")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "링크" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    const image = screen.getByRole("img", { name: "photo" });
    expect(image).toHaveAttribute("src", "/r2/images/photo.jpg");
    expect(image).toHaveClass("my-2", "max-h-64", "w-full");
  });
});
