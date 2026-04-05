import { describe, expect, it, vi, beforeEach } from "vitest";

const mockText = vi.fn();
const mockLine = vi.fn();
const mockAddPage = vi.fn();
const mockSave = vi.fn();
const mockSplitTextToSize = vi.fn().mockReturnValue(["Line 1"]);
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetLineWidth = vi.fn();

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    text: mockText,
    line: mockLine,
    addPage: mockAddPage,
    save: mockSave,
    splitTextToSize: mockSplitTextToSize,
    setFont: mockSetFont,
    setFontSize: mockSetFontSize,
    setTextColor: mockSetTextColor,
    setDrawColor: mockSetDrawColor,
    setLineWidth: mockSetLineWidth,
  })),
}));

describe("generatePDF", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates a PDF with title, genre, and sections", async () => {
    const { generatePDF } = await import("@/lib/pdf-export");
    generatePDF({
      title: "My Story",
      genre: "Fantasy",
      wordCount: 1500,
      sections: [
        {
          title: "Chapter 1",
          paragraphs: ["Once upon a time.", "They lived happily."],
          startsChapter: true,
        },
        {
          title: "Chapter 2",
          paragraphs: ["The end approached."],
          startsChapter: true,
        },
      ],
    });

    expect(mockSetFont).toHaveBeenCalled();
    expect(mockText).toHaveBeenCalled();
    expect(mockAddPage).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith("my-story.pdf");
  });

  it("handles stories with no genre", async () => {
    const { generatePDF } = await import("@/lib/pdf-export");
    generatePDF({
      title: "Untitled",
      genre: null,
      wordCount: 100,
      sections: [{ title: "Section 1", paragraphs: ["Text."], startsChapter: false }],
    });
    expect(mockSave).toHaveBeenCalledWith("untitled.pdf");
  });

  it("sanitizes title for filename", async () => {
    const { generatePDF } = await import("@/lib/pdf-export");
    generatePDF({
      title: "My Story: Part 1!",
      genre: null,
      wordCount: 50,
      sections: [{ title: "S1", paragraphs: ["p"], startsChapter: false }],
    });
    expect(mockSave).toHaveBeenCalledWith("my-story-part-1.pdf");
  });

  it("uses fallback filename for empty title", async () => {
    const { generatePDF } = await import("@/lib/pdf-export");
    generatePDF({
      title: "!!!",
      genre: null,
      wordCount: 0,
      sections: [],
    });
    expect(mockSave).toHaveBeenCalledWith("story.pdf");
  });

  it("handles page overflow with multiple sections and paragraphs", async () => {
    // Simulate text that would cause page breaks
    mockSplitTextToSize.mockReturnValue(Array(100).fill("A long line of text"));
    const { generatePDF } = await import("@/lib/pdf-export");
    generatePDF({
      title: "Long Story",
      genre: "Thriller",
      wordCount: 10000,
      sections: [
        {
          title: "Chapter 1",
          paragraphs: ["A very long paragraph that spans many lines.", "Another paragraph.", "Third paragraph."],
          startsChapter: true,
        },
        {
          title: "Chapter 2",
          paragraphs: ["More content."],
          startsChapter: true,
        },
      ],
    });
    // Multiple pages should have been added
    expect(mockAddPage.mock.calls.length).toBeGreaterThan(2);
    expect(mockSave).toHaveBeenCalled();
  });
});
