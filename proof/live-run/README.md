# Live Pocket run proof

Date: 2026-11-20 UTC

Project: Crypto Research Assistant

Repository: https://github.com/frenzoblings57-dot/crypto-research-assistant

## Live test

Topic entered:

> How does Pocket Network support AI agent research workflows?

The run used the existing Pocket Agentic Portal services only:

- Search: `agentsearch-web-search-v1`
- Extract: `agentsearch-web-extract-v1`
- Pocket route: `https://agent.pocket.network`

## Result

- 1 Pocket search call
- 2 Pocket extract calls
- 3 Pocket calls total
- All 3 calls returned HTTP 200
- Payment receipts were visible in the audit trail
- Total shown: `$0.015000 used / $0.020000 cap`
- Single-source findings were visibly marked `SINGLE SOURCE`
- The protected wallet was not shown

## Screenshots

1. `01-clean-start.webp` shows the clean demo before the run.
2. `02-topic-entered.webp` shows the topic entered before submission.
3. `03-pocket-run-started.webp` shows the request moving through Pocket.
4. `04-results-and-flags.webp` shows the completed brief, source set, and single-source warnings.
5. `05-source-and-audit-trail.webp` shows the two pages read through Pocket and all three successful audit rows.

These screenshots are sanitized UI evidence. They contain no private key, payment signature, or wallet address.
