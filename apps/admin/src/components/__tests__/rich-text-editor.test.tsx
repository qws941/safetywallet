import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "@/components/rich-text-editor";

const useEditorMock = vi.fn();
const placeholderConfigureMock = vi.fn((opts: unknown) => opts);
const setContentMock = vi.fn();

const runCalls: string[] = [];

const createMockEditor = (options?: {
  html?: string;
  canUndo?: boolean;
  canRedo?: boolean;
}) => {
  let html = options?.html ?? "<p>old</p>";
  const canUndo = options?.canUndo ?? true;
  const canRedo = options?.canRedo ?? false;

  const chainApi = {
    focus: () => chainApi,
    toggleBold: () => {
      runCalls.push("toggleBold");
      return chainApi;
    },
    toggleItalic: () => {
      runCalls.push("toggleItalic");
      return chainApi;
    },
    toggleStrike: () => {
      runCalls.push("toggleStrike");
      return chainApi;
    },
    toggleHeading: () => {
      runCalls.push("toggleHeading");
      return chainApi;
    },
    toggleBulletList: () => {
      runCalls.push("toggleBulletList");
      return chainApi;
    },
    toggleOrderedList: () => {
      runCalls.push("toggleOrderedList");
      return chainApi;
    },
    toggleBlockquote: () => {
      runCalls.push("toggleBlockquote");
      return chainApi;
    },
    setHorizontalRule: () => {
      runCalls.push("setHorizontalRule");
      return chainApi;
    },
    undo: () => {
      runCalls.push("undo");
      return chainApi;
    },
    redo: () => {
      runCalls.push("redo");
      return chainApi;
    },
    run: () => true,
  };

  const canChainApi = {
    focus: () => canChainApi,
    undo: () => canChainApi,
    redo: () => canChainApi,
    run: () => canUndo,
  };

  const canRedoChainApi = {
    focus: () => canRedoChainApi,
    undo: () => canRedoChainApi,
    redo: () => canRedoChainApi,
    run: () => canRedo,
  };

  return {
    chain: () => chainApi,
    can: () => ({
      chain: () => ({
        focus: () => ({
          undo: () => canChainApi,
          redo: () => canRedoChainApi,
        }),
      }),
    }),
    isActive: () => false,
    getHTML: () => html,
    commands: {
      setContent: (next: string) => {
        setContentMock(next);
        html = next;
      },
    },
  };
};

vi.mock("@tiptap/react", () => ({
  useEditor: (opts: unknown) => useEditorMock(opts),
  EditorContent: ({ editor }: { editor: { getHTML: () => string } }) => (
    <div data-testid="editor-content">{editor.getHTML()}</div>
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({ default: "starter-kit" }));
vi.mock("@tiptap/extension-image", () => ({ default: "image-extension" }));
vi.mock("@tiptap/extension-color", () => ({ default: "color-extension" }));
vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: (opts: unknown) => placeholderConfigureMock(opts) },
}));

vi.mock("lucide-react", () => {
  const Icon = ({ children }: { children?: ReactNode }) => (
    <span>{children}</span>
  );
  return {
    Bold: Icon,
    Italic: Icon,
    Strikethrough: Icon,
    Heading2: Icon,
    Heading3: Icon,
    List: Icon,
    ListOrdered: Icon,
    Quote: Icon,
    Minus: Icon,
    Undo2: Icon,
    Redo2: Icon,
  };
});

describe("RichTextEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runCalls.length = 0;
    setContentMock.mockReset();
  });

  it("returns null when editor is not ready", () => {
    useEditorMock.mockReturnValue(null);

    const { container } = render(
      <RichTextEditor content="<p>x</p>" onChange={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("configures placeholder and renders content", () => {
    useEditorMock.mockReturnValue(createMockEditor({ html: "<p>hello</p>" }));

    render(
      <RichTextEditor
        content="<p>hello</p>"
        onChange={vi.fn()}
        placeholder="공지 내용을 입력"
      />,
    );

    expect(placeholderConfigureMock).toHaveBeenCalledWith({
      placeholder: "공지 내용을 입력",
    });
    expect(screen.getByTestId("editor-content")).toHaveTextContent(
      "<p>hello</p>",
    );
  });

  it("syncs external content updates through setContent", () => {
    const editor = createMockEditor({ html: "<p>old</p>" });
    useEditorMock.mockReturnValue(editor);

    render(<RichTextEditor content="<p>new</p>" onChange={vi.fn()} />);

    expect(setContentMock).toHaveBeenCalledWith("<p>new</p>");
  });

  it("runs formatting commands from toolbar buttons", () => {
    useEditorMock.mockReturnValue(
      createMockEditor({ canUndo: true, canRedo: false }),
    );

    render(<RichTextEditor content="<p>x</p>" onChange={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);

    expect(runCalls).toEqual(
      expect.arrayContaining(["toggleBold", "toggleItalic", "toggleStrike"]),
    );
    expect(buttons[10]).toBeDisabled();
  });
});
