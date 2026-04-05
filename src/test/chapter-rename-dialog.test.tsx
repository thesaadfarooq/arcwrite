import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChapterRenameDialog } from "@/components/story/ChapterRenameDialog";

describe("ChapterRenameDialog", () => {
  const defaultProps = {
    open: true,
    chapterId: "ch1",
    currentTitle: "Chapter One",
    onOpenChange: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onGenerateTitle: vi.fn().mockResolvedValue("Generated Title"),
  };

  it("renders the dialog with current title", () => {
    render(<ChapterRenameDialog {...defaultProps} />);
    expect(screen.getByText("Rename chapter")).toBeDefined();
    expect(screen.getByDisplayValue("Chapter One")).toBeDefined();
  });

  it("allows editing the title", () => {
    render(<ChapterRenameDialog {...defaultProps} />);
    const input = screen.getByLabelText("Chapter title");
    fireEvent.change(input, { target: { value: "New Title" } });
    expect((input as HTMLInputElement).value).toBe("New Title");
  });

  it("saves the title when Save button is clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<ChapterRenameDialog {...defaultProps} onSave={onSave} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText("Chapter title"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByText("Save title"));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("Updated"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("generates a title suggestion", async () => {
    render(<ChapterRenameDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Generate title"));

    await waitFor(() => expect(screen.getByText("Suggested title")).toBeDefined());
    await waitFor(() => expect(screen.getByText("Generated Title")).toBeDefined());
  });

  it("applies the suggested title when Use suggestion is clicked", async () => {
    render(<ChapterRenameDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Generate title"));

    await waitFor(() => expect(screen.getByText("Use suggestion")).toBeDefined());
    fireEvent.click(screen.getByText("Use suggestion"));

    const input = screen.getByLabelText("Chapter title") as HTMLInputElement;
    expect(input.value).toBe("Generated Title");
  });

  it("does not render when closed", () => {
    const { container } = render(<ChapterRenameDialog {...defaultProps} open={false} />);
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });
});
