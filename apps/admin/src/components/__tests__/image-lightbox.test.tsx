import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ImageLightbox } from "@/components/image-lightbox";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@safetywallet/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@safetywallet/ui")>();
  return {
    ...actual,
    Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
      open ? <div>{children}</div> : null,
    DialogContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Button: ({
      children,
      onClick,
    }: {
      children: ReactNode;
      onClick?: () => void;
    }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
  };
});

describe("ImageLightbox", () => {
  it("returns null with empty images", () => {
    const { container } = render(
      <ImageLightbox
        images={[]}
        initialIndex={0}
        open
        onOpenChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders current image, counter, and download link", () => {
    render(
      <ImageLightbox
        images={["/one.jpg", "/two.jpg"]}
        initialIndex={1}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByAltText("이미지 2")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    const download = screen.getByRole("link");
    expect(download).toHaveAttribute("href", "/two.jpg");
    expect(download).toHaveAttribute("download", "image-2");
  });

  it("supports previous/next navigation with wrap-around", () => {
    render(
      <ImageLightbox
        images={["/one.jpg", "/two.jpg"]}
        initialIndex={0}
        open
        onOpenChange={vi.fn()}
      />,
    );

    const navButtons = screen.getAllByRole("button");
    fireEvent.click(navButtons[1]);
    expect(screen.getByAltText("이미지 2")).toBeInTheDocument();

    fireEvent.click(navButtons[1]);
    expect(screen.getByAltText("이미지 1")).toBeInTheDocument();

    fireEvent.click(navButtons[0]);
    expect(screen.getByAltText("이미지 2")).toBeInTheDocument();
  });

  it("resets to initial index when reopening", () => {
    const { rerender } = render(
      <ImageLightbox
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        initialIndex={0}
        open
        onOpenChange={vi.fn()}
      />,
    );

    const navButtons = screen.getAllByRole("button");
    fireEvent.click(navButtons[1]);
    expect(screen.getByAltText("이미지 2")).toBeInTheDocument();

    rerender(
      <ImageLightbox
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        initialIndex={2}
        open={false}
        onOpenChange={vi.fn()}
      />,
    );
    rerender(
      <ImageLightbox
        images={["/one.jpg", "/two.jpg", "/three.jpg"]}
        initialIndex={2}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByAltText("이미지 3")).toBeInTheDocument();
  });
});
