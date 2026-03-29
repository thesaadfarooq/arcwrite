import { describe, expect, it } from "vitest";
import {
  getToneProfile,
  getToneDirective,
  getNamingGuidance,
  TONE_PROFILES,
} from "@/lib/tone-profiles";

describe("tone profiles", () => {
  it("returns a full profile for each preset tone", () => {
    const profile = getToneProfile("Dark & gritty");
    expect(profile).toBeDefined();
    expect(profile!.label).toBe("Dark & gritty");
    expect(profile!.helper).toBeTruthy();
    expect(profile!.systemDirective).toBeTruthy();
    expect(profile!.systemDirective.length).toBeGreaterThan(100);
  });

  it("returns undefined for a custom tone", () => {
    expect(getToneProfile("My weird custom tone")).toBeUndefined();
  });

  it("returns the full directive for a preset tone", () => {
    const directive = getToneDirective("Poetic & dreamlike");
    expect(directive).toContain("Lush imagery");
    expect(directive).toContain("TONE:");
  });

  it("returns a thin one-liner for a custom tone", () => {
    const directive = getToneDirective("Sardonic and cold");
    expect(directive).toBe("TONE: Write in a Sardonic and cold style. Maintain this tone consistently.");
  });

  it("returns undefined directive when no tone is provided", () => {
    expect(getToneDirective(undefined)).toBeUndefined();
  });

  it("exports all six preset profiles", () => {
    expect(TONE_PROFILES).toHaveLength(6);
    const labels = TONE_PROFILES.map((p) => p.label);
    expect(labels).toContain("Dark & gritty");
    expect(labels).toContain("Whimsical & light");
    expect(labels).toContain("Literary & introspective");
    expect(labels).toContain("Fast-paced & cinematic");
    expect(labels).toContain("Poetic & dreamlike");
    expect(labels).toContain("Humorous & witty");
  });
});

describe("naming guidance", () => {
  it("returns fantasy-specific guidance for fantasy genre", () => {
    const guidance = getNamingGuidance("Fantasy");
    expect(guidance).toContain("NAMING");
    expect(guidance).toContain("pseudo-elvish");
  });

  it("returns sci-fi-specific guidance", () => {
    const guidance = getNamingGuidance("Sci-Fi");
    expect(guidance).toContain("institutional");
  });

  it("returns contemporary guidance for mystery", () => {
    const guidance = getNamingGuidance("Mystery");
    expect(guidance).toContain("contemporary");
  });

  it("returns horror-specific guidance", () => {
    const guidance = getNamingGuidance("Horror");
    expect(guidance).toContain("whimsical");
  });

  it("returns general guidance for an unknown genre", () => {
    const guidance = getNamingGuidance("Underwater Basket Weaving");
    expect(guidance).toContain("NAMING");
    expect(guidance).toContain("Elara");
  });

  it("returns general guidance when no genre is provided", () => {
    const guidance = getNamingGuidance(undefined);
    expect(guidance).toContain("NAMING");
  });
});
