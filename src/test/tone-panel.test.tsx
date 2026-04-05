import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TonePanelContent, TonePanel } from "@/components/story/TonePanel";

describe("TonePanelContent", () => {
  const defaults = {
    currentTone: undefined as string | undefined,
    onToneChange: vi.fn(),
    onDone: vi.fn(),
    canCustomTone: true,
  };

  it("renders tone options", () => {
    render(<TonePanelContent {...defaults} />);
    expect(screen.getByText("Story Tone")).toBeDefined();
    expect(screen.getByText("Dark & gritty")).toBeDefined();
    expect(screen.getByText("Whimsical & light")).toBeDefined();
  });

  it("selects a tone and closes", () => {
    const onToneChange = vi.fn();
    const onDone = vi.fn();
    render(<TonePanelContent {...defaults} onToneChange={onToneChange} onDone={onDone} />);
    fireEvent.click(screen.getByText("Dark & gritty"));
    expect(onToneChange).toHaveBeenCalledWith("Dark & gritty");
    expect(onDone).toHaveBeenCalled();
  });

  it("accepts a custom tone", () => {
    const onToneChange = vi.fn();
    const onDone = vi.fn();
    render(<TonePanelContent {...defaults} onToneChange={onToneChange} onDone={onDone} />);
    const input = screen.getByPlaceholderText("Custom tone…");
    fireEvent.change(input, { target: { value: "whimsical" } });
    fireEvent.click(screen.getByText("Set"));
    expect(onToneChange).toHaveBeenCalledWith("whimsical");
    expect(onDone).toHaveBeenCalled();
  });

  it("disables Set button when custom tone is too short", () => {
    render(<TonePanelContent {...defaults} />);
    const setBtn = screen.getByText("Set") as HTMLButtonElement;
    expect(setBtn.disabled).toBe(true);
  });

  it("shows lock message when canCustomTone is false", () => {
    render(<TonePanelContent {...defaults} canCustomTone={false} />);
    expect(screen.getByText(/Custom tones available on Plus and Pro/)).toBeDefined();
  });

  it("closes when X is clicked", () => {
    const onDone = vi.fn();
    render(<TonePanelContent {...defaults} onDone={onDone} />);
    // The close button is in the header row next to "Story Tone"
    const header = screen.getByText("Story Tone").closest("div")!.parentElement!;
    const closeBtn = header.querySelector("button")!;
    fireEvent.click(closeBtn);
    expect(onDone).toHaveBeenCalled();
  });
});

describe("TonePanel", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <TonePanel isOpen={false} currentTone="Epic" onToneChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders content when open", () => {
    render(
      <TonePanel isOpen={true} currentTone="Epic" onToneChange={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByText("Story Tone")).toBeDefined();
  });
});
