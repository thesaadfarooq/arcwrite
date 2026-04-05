import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RewriteInput } from "@/components/story/RewriteInput";

describe("RewriteInput", () => {
  const defaults = {
    onSubmit: vi.fn(),
    onAccept: vi.fn(),
    onRevert: vi.fn(),
    onCancel: vi.fn(),
    isStreaming: false,
    hasResult: false,
  };

  it("renders input and submit button in instruction mode", () => {
    render(<RewriteInput {...defaults} />);
    expect(screen.getByPlaceholderText("How should this be rewritten?")).toBeDefined();
  });

  it("does not submit when instruction is too short", () => {
    const onSubmit = vi.fn();
    render(<RewriteInput {...defaults} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText("How should this be rewritten?");
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on Enter when instruction is long enough", () => {
    const onSubmit = vi.fn();
    render(<RewriteInput {...defaults} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText("How should this be rewritten?");
    fireEvent.change(input, { target: { value: "make it better" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("make it better");
  });

  it("calls onCancel on Escape", () => {
    const onCancel = vi.fn();
    render(<RewriteInput {...defaults} onCancel={onCancel} />);
    const input = screen.getByPlaceholderText("How should this be rewritten?");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("submits via button click", () => {
    const onSubmit = vi.fn();
    render(<RewriteInput {...defaults} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText("How should this be rewritten?");
    fireEvent.change(input, { target: { value: "rewrite this" } });
    // The submit button is the only button in instruction mode
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onSubmit).toHaveBeenCalledWith("rewrite this");
  });

  it("disables input when streaming", () => {
    render(<RewriteInput {...defaults} isStreaming={true} />);
    const input = screen.getByPlaceholderText("How should this be rewritten?") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("shows Accept and Revert buttons when hasResult and not streaming", () => {
    render(<RewriteInput {...defaults} hasResult={true} isStreaming={false} />);
    expect(screen.getByText("Accept")).toBeDefined();
    expect(screen.getByText("Revert")).toBeDefined();
  });

  it("calls onAccept when Accept is clicked", () => {
    const onAccept = vi.fn();
    render(<RewriteInput {...defaults} hasResult={true} onAccept={onAccept} />);
    fireEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("calls onRevert when Revert is clicked", () => {
    const onRevert = vi.fn();
    render(<RewriteInput {...defaults} hasResult={true} onRevert={onRevert} />);
    fireEvent.click(screen.getByText("Revert"));
    expect(onRevert).toHaveBeenCalledOnce();
  });
});
