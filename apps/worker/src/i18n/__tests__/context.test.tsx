import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "@/i18n/context";
import { getLocale } from "@/i18n/loader";

vi.mock("@/i18n/loader", () => ({ getLocale: vi.fn() }));

function ContextConsumer() {
  const { locale, setLocale, messages, isLoading } = useI18n();

  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="message">{messages.greeting ?? ""}</div>
      <div data-testid="loading">{String(isLoading)}</div>
      <button type="button" onClick={() => setLocale("en")}>
        set-en
      </button>
    </div>
  );
}

describe("I18nProvider and useI18n", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("throws when useI18n is called outside provider", () => {
    expect(() => render(<ContextConsumer />)).toThrow(
      "useI18n must be used within I18nProvider",
    );
  });

  it("uses initial locale and messages without loading", () => {
    render(
      <I18nProvider initialLocale="ko" initialMessages={{ greeting: "안녕" }}>
        <ContextConsumer />
      </I18nProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("ko");
    expect(screen.getByTestId("message")).toHaveTextContent("안녕");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(getLocale).not.toHaveBeenCalled();
  });

  it("loads saved valid locale from localStorage on mount", async () => {
    localStorage.setItem("i18n-locale", "en");
    vi.mocked(getLocale).mockResolvedValue({ greeting: "hello" });

    render(
      <I18nProvider>
        <ContextConsumer />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
      expect(screen.getByTestId("message")).toHaveTextContent("hello");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(getLocale).toHaveBeenCalledWith("en");
  });

  it("loads current locale when no saved locale exists", async () => {
    vi.mocked(getLocale).mockResolvedValue({ greeting: "안녕하세요" });

    render(
      <I18nProvider initialLocale="ko">
        <ContextConsumer />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(getLocale).toHaveBeenCalledWith("ko");
      expect(screen.getByTestId("message")).toHaveTextContent("안녕하세요");
    });
  });

  it("falls back to default locale when locale load fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getLocale).mockRejectedValue(new Error("load failed"));

    render(
      <I18nProvider initialLocale="en">
        <ContextConsumer />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("ko");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("does not log load failure in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getLocale).mockRejectedValue(new Error("load failed"));

    try {
      render(
        <I18nProvider initialLocale="en">
          <ContextConsumer />
        </I18nProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("locale")).toHaveTextContent("ko");
      });

      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("setLocale loads new locale and persists it", async () => {
    vi.mocked(getLocale).mockResolvedValue({ greeting: "hello" });

    render(
      <I18nProvider initialLocale="ko" initialMessages={{ greeting: "안녕" }}>
        <ContextConsumer />
      </I18nProvider>,
    );

    screen.getByRole("button", { name: "set-en" }).click();

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
      expect(screen.getByTestId("message")).toHaveTextContent("hello");
    });
    expect(localStorage.getItem("i18n-locale")).toBe("en");
  });
});
