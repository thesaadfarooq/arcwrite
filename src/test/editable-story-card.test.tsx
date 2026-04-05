import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StoryGridCard, StoryListCard } from "@/components/dashboard/EditableStoryCard";

const story = {
  id: "s1",
  title: "My Story",
  genre: "Fantasy",
  tone: "Epic",
  status: "in_progress",
  created_at: "2024-01-01",
  updated_at: "2024-06-15",
  premise: "A tale of adventure",
};

const cardProps = {
  story,
  index: 0,
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onRename: vi.fn(),
  getStatusColor: (s: string) => s === "in_progress" ? "text-green" : "text-muted",
  getStatusLabel: (s: string) => s === "in_progress" ? "In Progress" : "Draft",
};

describe("StoryGridCard inline edit", () => {
  it("enters edit mode on title click and commits on blur", () => {
    const onRename = vi.fn();
    render(
      <MemoryRouter>
        <StoryGridCard {...cardProps} onRename={onRename} />
      </MemoryRouter>
    );
    // Click the title to enter edit mode
    fireEvent.click(screen.getByText("My Story"));
    const input = screen.getByDisplayValue("My Story") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.blur(input);
    expect(onRename).toHaveBeenCalledWith("s1", "New Title");
  });

  it("reverts on Escape key", () => {
    const onRename = vi.fn();
    render(
      <MemoryRouter>
        <StoryGridCard {...cardProps} onRename={onRename} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("My Story"));
    const input = screen.getByDisplayValue("My Story");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    // Should not call onRename and revert to original
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("My Story")).toBeDefined();
  });

  it("commits on Enter key", () => {
    const onRename = vi.fn();
    render(
      <MemoryRouter>
        <StoryGridCard {...cardProps} onRename={onRename} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("My Story"));
    const input = screen.getByDisplayValue("My Story");
    fireEvent.change(input, { target: { value: "Enter Title" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).toHaveBeenCalledWith("s1", "Enter Title");
  });

  it("does not rename if value is unchanged", () => {
    const onRename = vi.fn();
    render(
      <MemoryRouter>
        <StoryGridCard {...cardProps} onRename={onRename} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("My Story"));
    const input = screen.getByDisplayValue("My Story");
    fireEvent.blur(input);
    expect(onRename).not.toHaveBeenCalled();
  });
});

describe("StoryListCard inline edit", () => {
  it("enters edit mode on title click", () => {
    render(
      <MemoryRouter>
        <StoryListCard {...cardProps} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("My Story"));
    expect(screen.getByDisplayValue("My Story")).toBeDefined();
  });
});
