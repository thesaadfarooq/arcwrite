export type StartMode = "scratch" | "genre" | "surprise";

export interface QuickStartOption {
  id: StartMode;
  label: string;
  description: string;
  href: string;
}

export const QUICK_START_OPTIONS: QuickStartOption[] = [
  {
    id: "scratch",
    label: "Write from scratch",
    description: "Start with your own premise and shape the story from the first line.",
    href: "/story/new",
  },
  {
    id: "genre",
    label: "Pick a genre",
    description: "Choose a world first, then let Arcwrite help you find the premise.",
    href: "/story/new?mode=genre",
  },
  {
    id: "surprise",
    label: "Surprise me",
    description: "Jump in fast with a random story setup and discover the tone as you go.",
    href: "/story/new?mode=surprise",
  },
];

export const PREMISE_STARTERS = [
  "A retired astronaut discovers a signal from a star system she visited decades ago, but the voice on the transmission is her own.",
  "A city bans sleep after people begin sharing the same prophetic dream, and your character is the only one who wants to keep dreaming.",
  "During a royal funeral, a hidden door opens beneath the cathedral and reveals a living witness who claims the dead ruler was never human.",
];

export const GENRE_STARTERS: Record<string, string[]> = {
  fantasy: [
    "A village blacksmith accidentally forges a blade that can cut through sworn promises instead of steel.",
    "Every heir to the throne receives a dragon egg, but yours hatches into a creature that speaks in riddles about the kingdom's collapse.",
  ],
  scifi: [
    "A deep-space mechanic finds a message carved inside a ship part that has not been manufactured yet.",
    "Your colony's weather AI starts hiding parts of the sky after detecting something descending through the clouds.",
  ],
  mystery: [
    "A missing-person case reopens when the victim begins leaving fresh fingerprints at crime scenes across the city.",
    "A historian finds a diary that predicts each morning's headline with perfect accuracy, except for the entry naming them as the next suspect.",
  ],
  romance: [
    "Two rival journalists are assigned to fake a relationship for access to a scandal-plagued royal court, then realize the court is the least dangerous part.",
    "A violin restorer keeps finding unsent love letters hidden inside the instruments she repairs, all signed by the same stranger.",
  ],
  horror: [
    "After moving into a remote inn, you learn every room is named after a guest who disappeared there and your key matches tomorrow's entry.",
    "A grief support group begins receiving midnight calls from loved ones whose funerals have not happened yet.",
  ],
  thriller: [
    "A crisis negotiator receives a hostage video filmed from inside their own apartment while they are still standing in it.",
    "A junior analyst uncovers a security breach timed to coincide with a citywide blackout and the only witness refuses to speak until the lights go out.",
  ],
};

export function getGuestOrAuthedHref(href: string, isAuthenticated: boolean) {
  return isAuthenticated ? href : "/auth";
}

export function getSharedStorySecondaryCta(genre?: string | null) {
  if (!genre) {
    return {
      label: "Surprise me",
      href: "/story/new?mode=surprise",
    };
  }

  const slug = genre.toLowerCase();
  return {
    label: `Start a ${slug} story`,
    href: `/story/new?mode=genre&genre=${slug}`,
  };
}
