import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParagraphActionBar } from "@/components/story/ParagraphActionBar";

describe("ParagraphActionBar", () => {
  it("renders Edit and Rewrite buttons", () => {
    render(<ParagraphActionBar onEdit={vi.fn()} onRewrite={vi.fn()} />);
    expect(screen.getByText("Edit")).toBeDefined();
    expect(screen.getByText("Rewrite")).toBeDefined();
  });

  it("calls onEdit when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(<ParagraphActionBar onEdit={onEdit} onRewrite={vi.fn()} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("calls onRewrite when Rewrite is clicked", () => {
    const onRewrite = vi.fn();
    render(<ParagraphActionBar onEdit={vi.fn()} onRewrite={onRewrite} />);
    fireEvent.click(screen.getByText("Rewrite"));
    expect(onRewrite).toHaveBeenCalledOnce();
  });
});
