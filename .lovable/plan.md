

## Section Length Control

**Problem**: The generation length is hardcoded — `max_completion_tokens: 1500` and the system prompt forces "2-3 paragraphs." Users have no way to control how much text gets generated per section.

**Solution**: Add a "Section Length" control to the writing UI that lets users pick how long the next generated section should be. Pass that preference to the edge function, which adjusts both the system prompt wording and `max_completion_tokens` accordingly.

---

### Length Presets

| Preset | Label | Paragraphs | max_completion_tokens |
|--------|-------|-----------|----------------------|
| short | Short (~100 words) | 1-2 paragraphs | 500 |
| medium | Medium (~250 words) | 2-3 paragraphs | 1200 |
| long | Long (~500 words) | 4-6 paragraphs | 2500 |
| epic | Epic (~1000 words) | 8-10 paragraphs | 4000 |

Default: **medium** (current behavior).

---

### Changes

**1. Edge function `generate-section/index.ts`**
- Accept a new `length` parameter (short/medium/long/epic)
- Map it to paragraph count instruction in the system prompt and `max_completion_tokens` in the API call
- Fall back to "medium" if not provided

**2. Client API `src/lib/story-api.ts`**
- Add `length` to the `streamSection` parameters and pass it in the request body

**3. Story writing page `src/pages/StoryWrite.tsx`**
- Add a `sectionLength` state (default: "medium")
- Pass it to both `generateOpening` and `handleChoiceSelected` calls
- Add a length selector UI near the tone panel or generation controls — a simple segmented button group or select dropdown

**4. UI placement**
- Place the length selector in the TonePanel or as a small control row near the "generating..." area, so it's accessible but not cluttering the main canvas

---

### Technical Details

- The system prompt line changes from hardcoded "2-3 paragraphs" to dynamic based on the length map
- `max_completion_tokens` scales accordingly to avoid cutting off longer outputs
- No database changes needed — length is a per-generation preference, not persisted

