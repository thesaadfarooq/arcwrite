import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StoryGridCard, StoryListCard } from "@/components/dashboard/EditableStoryCard";

const mockStory = {
  id: "s1",
  title: "Test Story",
  genre: "Fantasy",
  tone: "dark",
  status: "in_progress",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-03-15T12:00:00Z",
  premise: "A young wizard discovers a hidden world.",
};

const defaultProps = {
  story: mockStory,
  index: 0,
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  onRename: vi.fn(),
  getStatusColor: () => "text-primary",
  getStatusLabel: () => "In Progress",
};

describe("StoryGridCard", () => {
  it("renders the story title and genre", () => {
    render(
      <MemoryRouter>
        <StoryGridCard {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText("Test Story")).toBeDefined();
    expect(screen.getByText("Fantasy")).toBeDefined();
  });

  it("renders the status label", () => {
    render(
      <MemoryRouter>
        <StoryGridCard {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText("In Progress")).toBeDefined();
  });

  it("renders the premise", () => {
    render(
      <MemoryRouter>
        <StoryGridCard {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText(/young wizard/)).toBeDefined();
  });

  it("renders the date", () => {
    render(
      <MemoryRouter>
        <StoryGridCard {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Mar/)).toBeDefined();
  });
});

describe("StoryListCard", () => {
  it("renders the story title and genre", () => {
    render(
      <MemoryRouter>
        <StoryListCard {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText("Test Story")).toBeDefined();
    expect(screen.getByText("Fantasy")).toBeDefined();
  });

  it("renders the premise in truncated form", () => {
    render(
      <MemoryRouter>
        <StoryListCard {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText(/young wizard/)).toBeDefined();
  });

  it("renders without genre when null", () => {
    render(
      <MemoryRouter>
        <StoryListCard {...defaultProps} story={{ ...mockStory, genre: null, premise: null }} />
      </MemoryRouter>
    );
    expect(screen.getByText("Test Story")).toBeDefined();
  });
});
