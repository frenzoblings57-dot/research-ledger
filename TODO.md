# Crypto Research Assistant outcomes

## 1. Real Pocket search and extraction workflow
- The user enters a crypto topic.
- The app calls `agentsearch-web-search-v1` through Pocket's Agentic Portal.
- The app selects source links from the Pocket search response.
- The app calls `agentsearch-web-extract-v1` through Pocket's Agentic Portal for multiple source pages.
- No search or extract request is sent directly to the provider.

## 2. Source-backed brief with single-source warnings
- The app produces a concise research brief from the extracted Pocket responses.
- The brief includes source links and evidence snippets.
- Every claim supported by only one source is visibly flagged.
- Failed or inaccessible pages remain visible with an error status.

## 3. Reproducible proof surface
- The UI shows the actual service identifier, Pocket operation path, call count, status, timing, and response metadata.
- The project includes setup and reproduction documentation.
- The project does not expose wallet keys or private data.

## 4. Controlled spending
- The server uses the protected Pocket wallet and spending limits.
- The initial workflow is limited to one search and at most two extract calls.
- The server stops before exceeding the configured total or per-call cap.
