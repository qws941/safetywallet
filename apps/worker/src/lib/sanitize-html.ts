"use client";

import type { ReactNode } from "react";
import { createElement } from "react";

const ALLOWED_TAGS = new Set([
  "p",
  "strong",
  "em",
  "ul",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "img",
]);

const DROP_WITH_CONTENT_TAGS = new Set(["script", "iframe"]);

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:")) {
    return false;
  }

  const schemeMatch = lower.match(/^([a-z][a-z0-9+.-]*):/);
  if (!schemeMatch) {
    return true;
  }

  return schemeMatch[1] === "http" || schemeMatch[1] === "https";
}

function sanitizeNode(sourceNode: Node, targetParent: HTMLElement): void {
  if (sourceNode.nodeType === Node.TEXT_NODE) {
    targetParent.appendChild(
      document.createTextNode(sourceNode.textContent ?? ""),
    );
    return;
  }

  if (sourceNode.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const sourceElement = sourceNode as HTMLElement;
  const tagName = sourceElement.tagName.toLowerCase();

  if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
    return;
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    Array.from(sourceElement.childNodes).forEach((child) => {
      sanitizeNode(child, targetParent);
    });
    return;
  }

  const nextElement = document.createElement(tagName);

  if (tagName === "a") {
    const href = sourceElement.getAttribute("href");
    if (href && isSafeUrl(href)) {
      nextElement.setAttribute("href", href);
    }
    nextElement.setAttribute("target", "_blank");
    nextElement.setAttribute("rel", "noopener noreferrer");
  }

  if (tagName === "img") {
    const src = sourceElement.getAttribute("src");
    if (src && isSafeUrl(src)) {
      nextElement.setAttribute("src", src);
    }

    if (sourceElement.hasAttribute("alt")) {
      nextElement.setAttribute("alt", sourceElement.getAttribute("alt") ?? "");
    }
  }

  Array.from(sourceElement.childNodes).forEach((child) => {
    sanitizeNode(child, nextElement);
  });

  targetParent.appendChild(nextElement);
}

export function sanitizeAnnouncementHtml(raw: string): string {
  if (typeof raw !== "string" || raw.length === 0) {
    return "";
  }

  const parser = new DOMParser();
  const sourceDoc = parser.parseFromString(raw, "text/html");
  const outputRoot = document.createElement("div");

  Array.from(sourceDoc.body.childNodes).forEach((child) => {
    sanitizeNode(child, outputRoot);
  });

  return outputRoot.innerHTML;
}

export function hasHtmlContent(str: string): boolean {
  if (typeof str !== "string" || str.length === 0) {
    return false;
  }

  return /<\/?[a-z][\s\S]*?>/i.test(str);
}

function nodeToReactNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) =>
    nodeToReactNode(child, `${key}-${index}`),
  );

  if (tagName === "a") {
    return createElement(
      "a",
      {
        key,
        href: element.getAttribute("href") ?? undefined,
        target: element.getAttribute("target") ?? undefined,
        rel: element.getAttribute("rel") ?? undefined,
      },
      ...children,
    );
  }

  if (tagName === "img") {
    return createElement("img", {
      key,
      src: element.getAttribute("src") ?? undefined,
      alt: element.getAttribute("alt") ?? undefined,
      className: "my-2 max-h-64 w-full",
    });
  }

  return createElement(tagName, { key }, ...children);
}

export function renderSanitizedAnnouncementHtml(raw: string): ReactNode[] {
  const sanitized = sanitizeAnnouncementHtml(raw);
  if (!sanitized) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, "text/html");

  return Array.from(doc.body.childNodes).map((node, index) =>
    nodeToReactNode(node, `node-${index}`),
  );
}
