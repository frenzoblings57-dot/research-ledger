# Crypto Research Assistant plan

## Product
A small web app for source-backed crypto research. A user enters a topic, the server sends the search request through Pocket's Agentic Portal, selects up to two public result URLs, sends each extraction request through Pocket, and returns a concise evidence brief with a visible audit trail.

## Required behavior
- Use only the approved Pocket services through `https://agent.pocket.network`.
- Search operation: `POST /v1/agentsearch-web-search-v1`.
- Extract operation: `POST /v1/agentsearch-web-extract-v1`.
- No direct calls to AgentSearch supplier/provider URLs.
- Use x402 payment on the server with protected wallet credentials and hard total/per-call caps.
- Show actual call status, service ID, endpoint, elapsed time, and response metadata in the audit trail.
- Flag every claim that has only one supporting source.
- Handle failed or inaccessible pages without hiding them.
- Keep the first live run within the user-supplied 0.02 USDC cap.
- Produce docs/repo-ready evidence without exposing secrets.

## Implementation approach
- Node.js + TypeScript + Express server.
- Static browser UI served from `public/` with no browser-side wallet or Pocket credential.
- `src/pocket.ts` contains the only Pocket client and uses x402-wrapped fetch.
- `src/research.ts` normalizes variable search/extract response shapes and builds deterministic briefs from returned text. It does not use direct web fetches or a second provider.
- The research route limits the initial run to one search and two extraction calls.
- `public/manus-routes.json` declares the page route.
- `README.md` documents setup, service IDs, exact Pocket path, payment model, and test proof format.

## Design direction
Three small style options:
- **Signal Ledger** (0.06): dark research-console surface with mint evidence accents and amber review warnings.
- **Archive Light** (0.04): paper-like white workspace with blue citation tabs and red uncertainty marks.
- **Night Dispatch** (0.08): charcoal editorial dashboard with electric green active states and orange callouts.

Chosen style: **Signal Ledger**.

### Design Movement
Editorial research console with a restrained terminal influence, designed for trust rather than spectacle.

### Core Principles
1. Evidence before decoration.
2. Every network call is visible.
3. Uncertainty is explicit, never hidden.
4. Dense information is broken into calm, readable panels.

### Color Philosophy
Deep ink backgrounds create a focused workspace. Mint identifies live Pocket activity and supported evidence. Amber is reserved for claims that need verification. Off-white text keeps long source excerpts readable.

### Layout Paradigm
A split editorial canvas: a narrow left rail for the research request and run status, a wide evidence column for findings, and a compact audit rail below the result. Avoid a generic centered card stack.

### Signature Elements
- Mint vertical signal line beside live Pocket calls.
- Amber single-source marker on claims needing corroboration.
- Monospaced service IDs paired with human-readable labels.

### Interaction Philosophy
The app should feel like a transparent instrument. Submit is the only primary action. While running, the audit list grows as each real Pocket call completes. Results remain useful even when one extraction fails.

### Animation
Use short 160–220ms fades and slide-ins for audit events and result panels. Never animate the content itself or add looping motion.

### Typography System
Use Inter for interface text and IBM Plex Mono for service IDs, metadata, and call counts. Strong title contrast, compact labels, and generous line height for source text.

### Brand Essence
A transparent crypto research instrument that turns a topic into a cited brief through real Pocket calls. Personality: clear, accountable, practical.

### Brand Voice
Headlines are direct: “Research with receipts.” CTAs are specific: “Run Pocket research.” Status text says what happened: “Search paid and returned 8 sources.”

### Wordmark & Logo
Use a simple two-line mark: a mint vertical relay line beside the letters “CR” in a compact monospaced lockup.

### Signature Brand Color
Pocket mint `#8AF5C4`.
