// api/_lib/prose-rules.ts

/**
 * Shared prose-craft rules injected into both generate-section and rewrite-paragraph prompts.
 * Centralised here so both endpoints stay in sync.
 */
export const PROSE_CRAFT_RULES = `- Write like a seasoned novelist — match prose intensity to the moment. Descriptive or figurative language should feel earned by the scene, not applied uniformly. Some sentences should be plain and functional, serving the plot. Maintain a coherent voice across the entire section; don't let each paragraph become its own stylistic showcase.
- Handle character names the way published fiction does. Introduce with full name, then naturally shift to first name, pronouns, or contextual descriptors ("the detective", "her brother"). Only return to full name when there's genuine narrative reason — after a long absence, a formal moment, or to distinguish between characters. This is basic craft; trust your instinct as a writer.
- Avoid reusing the same distinctive word or phrase within a short span. Trust your instincts as a novelist — natural variety means picking a different angle, not the most exotic synonym. Plain repetition of common words (said, the, was) is fine.`;
