# Crypto Research Assistant

A small source-backed research workflow built for the Pocket ambassador task. The user enters a crypto topic. The server sends one search request and up to two page-reading requests through Pocket's Agentic Portal, then renders a concise brief, source links, single-source flags, and a call-by-call audit trail.

## Pocket connection

All search and extract traffic goes to `https://agent.pocket.network`. The app does not call the AgentSearch provider URLs directly.

The approved operations are:

- `POST /v1/agentsearch-web-search-v1` with `{ "query": "...", "max_results": 6 }`
- `POST /v1/agentsearch-web-extract-v1` with `{ "url": "...", "formats": ["markdown", "text"], "max_chars": 8000 }`

The server uses `@x402/fetch` and `@x402/evm` to handle Pocket's x402 payment challenge. The private key stays server-side in protected project secrets. The configured chain is Base (`eip155:8453`). The x402 client enforces the per-call cap, while the app enforces the total test cap before starting each call.

## Protected configuration

The project needs these protected values. They must never be committed or pasted into the repository:

- `POCKET_PRIVATE_KEY`: a disposable EVM wallet key. The wallet should hold only the small USDC test budget.
- `POCKET_MAX_TOTAL_ATOMIC`: total six-decimal USDC atomic cap. The approved first-run value is `20000`, or $0.020000.
- `POCKET_MAX_PER_CALL_ATOMIC`: per-call six-decimal USDC atomic cap. The approved first-run value is `9000`, or $0.009000.

The live catalogue currently advertises $0.005000 for each approved operation. The first run therefore fits one search plus two extracts at $0.015000, leaving a buffer within the $0.020000 cap.

## Run locally in the project environment

```bash
npm install
npm run dev
```

Open the project Preview. Enter a topic such as `How does Pocket Network's relay marketplace work?` and select **Run Pocket research**. The UI shows the exact service ID, portal path, HTTP status, payment-receipt visibility, schema status, elapsed time, and the response preview is retained server-side only for the current result.

## Evidence to capture

For the ambassador submission, capture the working demo and the audit section showing one successful search and two successful extracts. Include this repository or its README, the two service IDs, the test topic, the final brief, and sanitized screenshots or logs. Never include the private key, wallet address if it identifies the operator, payment signatures, or private source data.

## Scope and limitations

The workflow intentionally reads at most two sources so the provided balance is protected. The total spending guard is cumulative for the running app process, so later runs stop when the configured cap has been used. A finding is marked **SINGLE SOURCE** unless the same normalized finding is supported by at least two extracted pages. This is a warning for human verification, not a claim that the source is false. The app does not silently replace failed Pocket calls with direct provider calls.
