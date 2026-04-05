import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChapterNavigation } from "@/components/story/ChapterNavigation";

describe("ChapterNavigation", () => {
  const defaults = {
    currentIndex: 1,
    totalChapters: 3,
    currentTitle: "The Journey",
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };

  it("renders title and pagination", () => {
    render(<ChapterNavigation {...defaults} />);
    expect(screen.getByText(/The Journey/)).toBeDefined();
    expect(screen.getByText(/2\/3/)).toBeDefined();
  });

  it("calls onPrev when Prev is clicked", () => {
    const onPrev = vi.fn();
    render(<ChapterNavigation {...defaults} onPrev={onPrev} />);
    fireEvent.click(screen.getByText("Prev"));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it("calls onNext when Next is clicked", () => {
    const onNext = vi.fn();
    render(<ChapterNavigation {...defaults} onNext={onNext} />);
    fireEvent.click(screen.getByText("Next"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("disables Prev on first chapter", () => {
    render(<ChapterNavigation {...defaults} currentIndex={0} />);
    const prevBtn = screen.getByText("Prev").closest("button")!;
    expect(prevBtn.disabled).toBe(true);
  });

  it("disables Next on last chapter", () => {
    render(<ChapterNavigation {...defaults} currentIndex={2} />);
    const nextBtn = screen.getByText("Next").closest("button")!;
    expect(nextBtn.disabled).toBe(true);
  });
});
