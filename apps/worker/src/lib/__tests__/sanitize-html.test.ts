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

  it("drops comment and whitespace-only URL attributes", () => {
    const raw =
      '<!--hidden--><p><a href="   ">빈 링크</a><img src="   " alt="empty-src" /></p>';

    const sanitized = sanitizeAnnouncementHtml(raw);

    expect(sanitized).not.toContain("hidden");
    expect(sanitized).toContain(
      '<a target="_blank" rel="noopener noreferrer">빈 링크</a>',
    );
    expect(sanitized).toContain('<img alt="empty-src">');
    expect(sanitized).not.toContain('href="');
    expect(sanitized).not.toContain('src="   "');
  });

  it("ignores non-text non-element nodes during sanitization", () => {
    const parse = DOMParser.prototype.parseFromString;
    const commentDoc = parse.call(new DOMParser(), "<p>ok</p>", "text/html");
    commentDoc.body.insertBefore(
      commentDoc.createComment("hidden"),
      commentDoc.body.firstChild,
    );

    const parserSpy = vi
      .spyOn(DOMParser.prototype, "parseFromString")
      .mockReturnValue(commentDoc);

    try {
      const sanitized = sanitizeAnnouncementHtml("ignored");
      expect(sanitized).toBe("<p>ok</p>");
      expect(sanitized).not.toContain("hidden");
    } finally {
      parserSpy.mockRestore();
    }
  });

  it("uses empty fallback when text node content is null", () => {
    const parserSpy = vi
      .spyOn(DOMParser.prototype, "parseFromString")
      .mockReturnValue({
        body: {
          childNodes: [{ nodeType: Node.TEXT_NODE, textContent: null }],
        },
      } as unknown as Document);

    try {
      expect(sanitizeAnnouncementHtml("ignored")).toBe("");
    } finally {
      parserSpy.mockRestore();
    }
  });

  it("applies empty alt fallback when image alt attribute returns null", () => {
    const fakeImageNode = {
      nodeType: Node.ELEMENT_NODE,
      tagName: "IMG",
      childNodes: [],
      getAttribute: (name: string) => {
        if (name === "src") {
          return "https://example.com/a.png";
        }

        if (name === "alt") {
          return null;
        }

        return null;
      },
      hasAttribute: (name: string) => name === "alt",
    };

    const parserSpy = vi
      .spyOn(DOMParser.prototype, "parseFromString")
      .mockReturnValue({
        body: {
          childNodes: [fakeImageNode],
        },
      } as unknown as Document);

    try {
      expect(sanitizeAnnouncementHtml("ignored")).toContain('alt=""');
    } finally {
      parserSpy.mockRestore();
    }
  });
});

describe("hasHtmlContent", () => {
  it("returns true when string has HTML tags", () => {
    expect(hasHtmlContent("<p>내용</p>")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasHtmlContent("그냥 텍스트입니다.")).toBe(false);
  });

  it("returns false for non-string values", () => {
    const invokeHasHtmlContent = hasHtmlContent as (value: unknown) => boolean;
    expect(invokeHasHtmlContent(null)).toBe(false);
    expect(invokeHasHtmlContent(123)).toBe(false);
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

  it("returns empty array when sanitized html is empty", () => {
    expect(renderSanitizedAnnouncementHtml("")).toEqual([]);
  });

  it("ignores non-element root nodes while rendering", () => {
    const nodes = renderSanitizedAnnouncementHtml("<!--hidden--><p>보임</p>");
    expect(nodes).toHaveLength(1);

    render(createElement(Fragment, null, nodes));

    expect(screen.getByText("보임")).toBeInTheDocument();
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("maps non-text non-element nodes to null when rendering", () => {
    const parse = DOMParser.prototype.parseFromString;
    const sourceDoc = parse.call(new DOMParser(), "<p>표시</p>", "text/html");
    const renderDoc = parse.call(new DOMParser(), "<p>표시</p>", "text/html");
    renderDoc.body.insertBefore(
      renderDoc.createComment("hidden"),
      renderDoc.body.firstChild,
    );

    let callCount = 0;
    const parserSpy = vi
      .spyOn(DOMParser.prototype, "parseFromString")
      .mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? sourceDoc : renderDoc;
      });

    try {
      const nodes = renderSanitizedAnnouncementHtml("<p>표시</p>");
      expect(nodes[0]).toBeNull();
      expect(nodes[1]).toBeTruthy();
    } finally {
      parserSpy.mockRestore();
    }
  });

  it("uses empty fallback for null text node content while rendering", () => {
    const parse = DOMParser.prototype.parseFromString;
    const sourceDoc = parse.call(new DOMParser(), "<p>seed</p>", "text/html");

    let callCount = 0;
    const parserSpy = vi
      .spyOn(DOMParser.prototype, "parseFromString")
      .mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return sourceDoc;
        }

        return {
          body: {
            childNodes: [{ nodeType: Node.TEXT_NODE, textContent: null }],
          },
        } as unknown as Document;
      });

    try {
      expect(renderSanitizedAnnouncementHtml("<p>seed</p>")).toEqual([""]);
    } finally {
      parserSpy.mockRestore();
    }
  });

  it("renders anchor without target and rel when parsed node lacks those attributes", () => {
    const parse = DOMParser.prototype.parseFromString;
    const sourceDoc = parse.call(
      new DOMParser(),
      "<a href='https://safe.example'>x</a>",
      "text/html",
    );
    const renderDoc = parse.call(
      new DOMParser(),
      "<a href='https://safe.example'>x</a>",
      "text/html",
    );
    const anchor = renderDoc.body.querySelector("a");

    anchor?.removeAttribute("target");
    anchor?.removeAttribute("rel");

    let callCount = 0;
    const parserSpy = vi
      .spyOn(DOMParser.prototype, "parseFromString")
      .mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? sourceDoc : renderDoc;
      });

    try {
      const nodes = renderSanitizedAnnouncementHtml(
        "<a href='https://safe.example'>x</a>",
      );
      render(createElement(Fragment, null, nodes));

      const link = screen.getByRole("link", { name: "x" });
      expect(link).toHaveAttribute("href", "https://safe.example");
      expect(link).not.toHaveAttribute("target");
      expect(link).not.toHaveAttribute("rel");
    } finally {
      parserSpy.mockRestore();
    }
  });

  it("renders anchor and image without optional attributes", () => {
    const nodes = renderSanitizedAnnouncementHtml("<a>링크만</a><img>");

    render(createElement(Fragment, null, nodes));

    const link = screen.getByText("링크만").closest("a");
    expect(link).not.toBeNull();
    expect(link).not.toHaveAttribute("href");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    const image = screen.getByRole("img");
    expect(image).not.toHaveAttribute("src");
    expect(image).not.toHaveAttribute("alt");
  });
});
