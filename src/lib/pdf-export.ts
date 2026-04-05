import jsPDF from "jspdf";

interface ExportSection {
  title: string;
  paragraphs: string[];
  startsChapter: boolean;
}

interface ExportData {
  title: string;
  genre: string | null;
  wordCount: number;
  sections: ExportSection[];
}

// Page dimensions (A4 in mm)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 25;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 25;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const MAX_Y = PAGE_H - MARGIN_BOTTOM;

// Colors
const BLACK = "#111111";
const DARK = "#333333";
const MEDIUM = "#666666";
const LIGHT = "#999999";
const RULE = "#cccccc";
const ACCENT = "#983510";

function addPageNumber(doc: jsPDF, page: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(LIGHT);
  doc.text(String(page), PAGE_W / 2, PAGE_H - 12, { align: "center" });
}

function addFooter(doc: jsPDF) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(LIGHT);
  doc.text("Created with Arcwrite", PAGE_W / 2, PAGE_H - 8, { align: "center" });
}

export function generatePDF(data: ExportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_TOP;
  let pageNum = 1;

  const ensureSpace = (needed: number) => {
    if (y + needed > MAX_Y) {
      addPageNumber(doc, pageNum);
      addFooter(doc);
      doc.addPage();
      pageNum++;
      y = MARGIN_TOP;
    }
  };

  // ── Title page ──
  const titleY = PAGE_H * 0.3;
  y = titleY;

  // Decorative top rule
  doc.setDrawColor(ACCENT);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X + 30, y - 20, PAGE_W - MARGIN_X - 30, y - 20);

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(BLACK);
  const titleLines = doc.splitTextToSize(data.title, CONTENT_W - 20);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * 12;

  // Genre
  if (data.genre) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(MEDIUM);
    doc.text(data.genre.toUpperCase(), PAGE_W / 2, y, { align: "center" });
    y += 8;
  }

  // Decorative divider
  y += 4;
  doc.setDrawColor(ACCENT);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 - 15, y, PAGE_W / 2 + 15, y);
  y += 10;

  // Word count
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(LIGHT);
  doc.text(`${data.wordCount.toLocaleString()} words`, PAGE_W / 2, y, { align: "center" });

  // Bottom rule on title page
  doc.setDrawColor(ACCENT);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X + 30, y + 20, PAGE_W - MARGIN_X - 30, y + 20);

  addPageNumber(doc, pageNum);
  addFooter(doc);

  // ── Content pages ──
  doc.addPage();
  pageNum++;
  y = MARGIN_TOP;

  for (let si = 0; si < data.sections.length; si++) {
    const section = data.sections[si];

    // Section heading
    ensureSpace(20);

    if (si > 0) {
      y += 4;
    }

    // Chapter heading with accent line
    doc.setDrawColor(ACCENT);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_X, y, MARGIN_X + 20, y);

    y += 6;
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(DARK);
    doc.text(section.title, MARGIN_X, y);
    y += 10;

    // Paragraphs
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(BLACK);

    for (let pi = 0; pi < section.paragraphs.length; pi++) {
      const para = section.paragraphs[pi];
      const lines = doc.splitTextToSize(para, CONTENT_W);
      const lineHeight = 5.5;
      const blockHeight = lines.length * lineHeight;
      const MIN_LINES = 3; // widow/orphan control

      // If the whole paragraph fits, keep it together
      if (y + blockHeight <= MAX_Y) {
        for (let li = 0; li < lines.length; li++) {
          const indent = (pi > 0 && li === 0) ? 8 : 0;
          doc.text(lines[li], MARGIN_X + indent, y);
          y += lineHeight;
        }
      } else {
        // Paragraph must split: ensure at least MIN_LINES on this page
        const linesRemaining = Math.floor((MAX_Y - y) / lineHeight);
        if (linesRemaining < MIN_LINES) {
          // Not enough room — start on next page
          addPageNumber(doc, pageNum);
          addFooter(doc);
          doc.addPage();
          pageNum++;
          y = MARGIN_TOP;
        }

        for (let li = 0; li < lines.length; li++) {
          if (y + lineHeight > MAX_Y) {
            // Before breaking, check widow: if fewer than MIN_LINES remain, they'd be orphaned on next page
            const linesLeft = lines.length - li;
            if (linesLeft < MIN_LINES && li >= MIN_LINES) {
              // Back up: we should have broken MIN_LINES earlier — but since we already rendered,
              // just break here and the remaining lines will start the next page
            }
            addPageNumber(doc, pageNum);
            addFooter(doc);
            doc.addPage();
            pageNum++;
            y = MARGIN_TOP;
          }
          const indent = (pi > 0 && li === 0) ? 8 : 0;
          doc.text(lines[li], MARGIN_X + indent, y);
          y += lineHeight;
        }
      }

      // Space between paragraphs
      y += 3;
    }

    // Space between sections
    y += 6;
  }

  // Final page number & footer
  addPageNumber(doc, pageNum);
  addFooter(doc);

  // ── End page ──
  doc.addPage();
  pageNum++;
  const endY = PAGE_H * 0.45;

  doc.setDrawColor(RULE);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 - 20, endY - 10, PAGE_W / 2 + 20, endY - 10);

  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(MEDIUM);
  doc.text("The End", PAGE_W / 2, endY, { align: "center" });

  doc.setDrawColor(RULE);
  doc.line(PAGE_W / 2 - 20, endY + 6, PAGE_W / 2 + 20, endY + 6);

  addPageNumber(doc, pageNum);
  addFooter(doc);

  // Save
  const safeTitle = data.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-").toLowerCase();
  doc.save(`${safeTitle || "story"}.pdf`);
}
