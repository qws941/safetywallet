import { cleanup } from "@testing-library/react";
import { createElement } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, vi } from "vitest";

const router = {
  push: vi.fn<(href: string) => void>(),
  replace: vi.fn<(href: string) => void>(),
  refresh: vi.fn<() => void>(),
  back: vi.fn<() => void>(),
  forward: vi.fn<() => void>(),
  prefetch: vi.fn<(href: string) => Promise<void>>(),
};

let pathname = "/";
let searchParams = new URLSearchParams();

export function setMockPathname(path: string) {
  pathname = path;
}

export function setMockSearchParams(
  params: Record<string, string> | URLSearchParams,
) {
  searchParams =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(Object.entries(params));
}

export function getMockRouter() {
  return router;
}

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
  } & Record<string, unknown>) => createElement("img", { src, alt, ...rest }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  pathname = "/";
  searchParams = new URLSearchParams();
});
