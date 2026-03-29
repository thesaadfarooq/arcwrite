import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TonePanelContent } from "@/components/story/TonePanel";
import { TONE_PROFILES } from "@/lib/tone-profiles";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("tone helper lines", () => {
  it("renders a helper line for each preset tone in TonePanel", () => {
    render(
      <TonePanelContent
        currentTone="Dark & gritty"
        onToneChange={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    for (const profile of TONE_PROFILES) {
      expect(screen.getByText(profile.helper)).toBeInTheDocument();
    }
  });

  it("helper lines are visible alongside their preset labels", () => {
    render(
      <TonePanelContent
        currentTone=""
        onToneChange={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText("Dark & gritty")).toBeInTheDocument();
    expect(screen.getByText("Harsh detail, grounded tension, rough realism")).toBeInTheDocument();
  });
});
