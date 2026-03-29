export interface ToneProfile {
  label: string;
  helper: string;
  systemDirective: string;
}

export const TONE_PROFILES: ToneProfile[] = [
  {
    label: "Dark & gritty",
    helper: "Harsh detail, grounded tension, rough realism",
    systemDirective:
      "Harsh detail, grounded tension, rough realism. Short declarative sentences dominate. Imagery is functional and unsparing — grime, weight, damage. Emotional distance is close but unsentimental. Introspection is minimal; characters act and react rather than reflect. Narration is blunt and direct.",
  },
  {
    label: "Whimsical & light",
    helper: "Playful voice, bright turns, airy charm",
    systemDirective:
      "Playful voice, bright turns, airy charm. Sentence rhythm bounces — short quips alternate with breezy longer lines. Imagery skews bright, odd, slightly exaggerated. Emotional distance is warm but never heavy. Introspection is light and often humorous. Narration has a wry, affectionate quality.",
  },
  {
    label: "Literary & introspective",
    helper: "Layered prose, careful interiority, symbolic detail",
    systemDirective:
      "Layered prose with careful attention to interiority. Sentences vary in length with deliberate rhythm. Imagery is selective and resonant — details carry symbolic weight. Emotional distance is close, with the narrative voice tracking the protagonist's inner experience. Introspection runs deep. Narration is measured and precise.",
  },
  {
    label: "Fast-paced & cinematic",
    helper: "Clear action lines, brisk momentum, visual immediacy",
    systemDirective:
      "Clear action lines, brisk momentum, visual immediacy. Sentences run short to medium with minimal subordinate clauses. Imagery is selective but vivid — camera-like, focused on motion and sensory impact. Emotional distance is moderate — enough to feel stakes, not enough to slow the pace. Introspection is minimal; when it appears it is brief and pressured. Narration is direct and propulsive.",
  },
  {
    label: "Poetic & dreamlike",
    helper: "Lush imagery, soft rhythm, surreal edges",
    systemDirective:
      "Lush imagery, soft rhythm, surreal edges. Sentences flow long with internal cadence and occasional fragmentation. Imagery is dense and often synesthetic or metaphorical. Emotional distance is immersive — the reader is inside the sensation. Introspection is deep but non-analytical, more felt than reasoned. Narration is allusive and layered.",
  },
  {
    label: "Humorous & witty",
    helper: "Sharp observations, comedic timing, irreverent edges",
    systemDirective:
      "Sharp observational voice, comedic timing, irreverent edges. Sentences vary — setups run longer, punchlines land short. Imagery is selective and often absurd or exaggerated for effect. Emotional distance is warm but deflective — sincerity hides behind humor. Introspection is intermittent and self-aware. Narration has a distinct personality and breaks the fourth wall lightly when appropriate.",
  },
];

const profileMap = new Map(TONE_PROFILES.map((p) => [p.label.toLowerCase(), p]));

/** Return the full profile for a preset tone, or undefined for custom tones. */
export function getToneProfile(tone: string): ToneProfile | undefined {
  return profileMap.get(tone.toLowerCase());
}

/**
 * Return the TONE system-prompt block for a given tone string.
 * Preset tones get the rich multi-sentence directive.
 * Custom tones get the existing thin one-liner.
 */
export function getToneDirective(tone: string | undefined): string | undefined {
  if (!tone) return undefined;
  const profile = getToneProfile(tone);
  if (profile) {
    return `TONE: ${profile.systemDirective}`;
  }
  return `TONE: Write in a ${tone} style. Maintain this tone consistently.`;
}

const GENERAL_NAMING = `NAMING:
- Avoid common AI-default fantasy names (Elara, Kael, Lyra, Zephyr, Rowan, Aria, Thorne) and close phonetic cousins.
- Vary phonetic shape across characters introduced in the same section.
- Preserve premise-given names exactly when they exist.
- Fit names to the implied setting and time period.`;

const GENRE_NAMING: Record<string, string> = {
  fantasy: `${GENERAL_NAMING}
- Vary cultural feel broadly. Avoid clustering around soft lyrical pseudo-elvish patterns.
- Mix guttural, clipped, polysyllabic, and compound names. Draw from wider cultural and linguistic inspirations.`,

  "sci-fi": `${GENERAL_NAMING}
- Allow technical, institutional, multilingual, industrial, or class-coded naming.
- Names can reflect social structures, corporate culture, or linguistic drift.`,

  "science fiction": `${GENERAL_NAMING}
- Allow technical, institutional, multilingual, industrial, or class-coded naming.
- Names can reflect social structures, corporate culture, or linguistic drift.`,

  mystery: `${GENERAL_NAMING}
- Default toward believable contemporary names that fit the implied setting and demographics.
- Avoid fantasy-inflected naming unless the premise pushes otherwise.`,

  thriller: `${GENERAL_NAMING}
- Default toward believable contemporary names that fit the implied setting and demographics.
- Avoid fantasy-inflected naming unless the premise pushes otherwise.`,

  romance: `${GENERAL_NAMING}
- Default toward believable contemporary names that fit the implied setting and demographics.
- Avoid fantasy-inflected naming unless the premise pushes otherwise.`,

  horror: `${GENERAL_NAMING}
- Avoid accidentally whimsical or soft names unless that contrast is intentional to the story's setup.
- Ground names in the setting's reality — mundane names can be more unsettling than exotic ones.`,
};

/** Return genre-appropriate naming guidance for the system prompt. */
export function getNamingGuidance(genre: string | undefined): string {
  if (!genre) return GENERAL_NAMING;
  return GENRE_NAMING[genre.toLowerCase()] ?? GENERAL_NAMING;
}
