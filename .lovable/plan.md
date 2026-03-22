

# VibeWrite — Implementation Plan

This is a large full-stack product. We'll build it incrementally, starting with the core experience and layering on features.

## Build Order

### Step 1: Design System & Shell
- Update CSS variables for the writerly palette (warm cream light mode, deep charcoal dark mode)
- Add serif font (Merriweather/Lora for story text, Inter for UI)
- Build the app shell: sidebar layout with dark/light toggle
- Create landing/home page with "Start from scratch", "Pick a genre", "Surprise me" entry points

### Step 2: Story Setup Flow
- Genre selection UI (cards with genre icons)
- Premise input (textarea with placeholder guidance)
- "Surprise me" button that will later call AI
- Route: `/story/new` → setup wizard → redirects to `/story/:id`

### Step 3: Story Canvas & Reading Experience
- Book-like canvas component with serif typography, comfortable margins
- Chapter sidebar navigation
- Word count display
- Dark/light mode styling for the canvas
- Inline text editing (contentEditable or controlled textarea per paragraph)

### Step 4: Choice System UI
- Choice cards component (4 types: Safe, Risky, Emotional, Chaotic)
- Each card: icon + label + preview text
- Free-text custom direction input
- "Regenerate options" button
- Loading/streaming states

### Step 5: Enable Lovable Cloud + AI Backend
- Enable Supabase for auth and database
- Create database tables: `stories`, `story_nodes`
- Enable Lovable AI Gateway
- Create edge functions:
  - `generate-section` — takes context layers + choice, streams prose
  - `generate-choices` — returns 4 typed choices via tool calling
  - `summarize` — compresses story state

### Step 6: Wire the Core Loop
- Connect setup flow → first AI generation (streaming)
- Connect choice selection → next section generation
- Implement multi-layer context assembly (recent text + summary + story state)
- Store nodes in tree structure (parent_id linking)
- Sentence-aware streaming buffer on frontend

### Step 7: Editing & Continuity
- Inline paragraph editing with desync detection
- "Re-align" prompt that triggers re-summarization
- Option invalidation on significant edits

### Step 8: Rollback & Branching
- Tree navigation in sidebar (visual timeline of choices)
- Jump to any node, fork new branch
- Branch management (rename, delete branch)

### Step 9: Tone System
- Tone selector at story creation (dropdown + custom input)
- Tone injection into all AI prompts
- Mid-story tone adjustment panel

### Step 10: Auth & Dashboard
- Supabase Auth (email + Google)
- Email verification enforcement
- Story dashboard: grid/list view with status, last edited, word count
- CRUD operations on stories

### Step 11: Stripe & Pricing Tiers
- Enable Stripe integration
- Three tiers: Free, Plus, Pro
- Feature gating (story limits, chapter limits, model quality, PDF, sharing)
- Rate limiting and generation caps

### Step 12: Export & Sharing
- Server-side PDF export edge function (reportlab-style)
- Public read-only share links (Pro only)
- Copy as formatted text

---

## Technical Details

### Database Schema
```text
stories
├── id (uuid, PK)
├── user_id (uuid, FK → auth.users)
├── title, genre, tone, premise
├── status (draft | in_progress | complete)
└── created_at, updated_at

story_nodes
├── id (uuid, PK)
├── story_id (uuid, FK → stories)
├── parent_id (uuid, FK → story_nodes, nullable)
├── text (the generated prose)
├── summary (rolling summary at this point)
├── story_state (jsonb: characters, locations, threads)
├── choices (jsonb: array of 4 typed choices)
├── chosen_option (jsonb: the selected choice)
├── is_active (boolean: current branch path)
└── created_at

user_roles (per security guidelines)
├── id, user_id, role (app_role enum)

subscriptions
├── user_id, stripe_customer_id, tier, status
```

### AI Prompt Architecture
Each generation call sends:
1. System prompt (tone + role + constraints)
2. Structured story state (characters, threads, locations)
3. Rolling summary of earlier content
4. Last 2-3 sections verbatim
5. The user's chosen direction

Choices use tool calling to return structured JSON with `safe`, `risky`, `emotional`, `chaotic` typed options.

### Key Frontend Components
- `StoryCanvas` — book-like reading/editing area
- `ChoiceCards` — the 4-option selection UI
- `StoryTimeline` — branch/rollback navigation
- `StorySetup` — wizard for new stories
- `Dashboard` — story management grid

### Streaming Strategy
Frontend buffers SSE tokens until sentence boundary (`. `, `! `, `? `, `\n`) before rendering, creating smooth sentence-by-sentence appearance.

---

## What We Build First

I'll start with **Steps 1-4** (design system, shell, canvas, choice UI) to establish the visual foundation and core UX. Then we enable the backend and wire the AI loop.

