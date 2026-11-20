# Live Pocket test proof

## Workflow

The Crypto Research Assistant accepted the topic `What is Pocket Network and how does its relay marketplace work?` and completed a real multi-call run through the Pocket Agentic Portal.

No direct request was sent to the AgentSearch provider URLs. The app used only the two approved portal operations:

- `agentsearch-web-search-v1` via `POST /v1/agentsearch-web-search-v1`
- `agentsearch-web-extract-v1` via `POST /v1/agentsearch-web-extract-v1`

## Observed outcome

The search call returned 5 usable public URLs. The app selected 2 pages and successfully extracted both. The generated result contained 4 source observations. Each was marked **SINGLE SOURCE** because it was not repeated as the same normalized finding in both pages. The UI also displayed the warning that these findings require verification.

The run used 0.015000 USDC against a configured total cap of 0.020000 USDC. The per-call cap was 0.009000 USDC.

## Sanitized audit trail

| Call | Service ID | Pocket path | Status | HTTP | Paid | Payment receipt | Elapsed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| search-1 | `agentsearch-web-search-v1` | `/v1/agentsearch-web-search-v1` | SUCCESS | 200 | yes | seen | 8,953 ms |
| extract-2 | `agentsearch-web-extract-v1` | `/v1/agentsearch-web-extract-v1` | SUCCESS | 200 | yes | seen | 3,059 ms |
| extract-3 | `agentsearch-web-extract-v1` | `/v1/agentsearch-web-extract-v1` | SUCCESS | 200 | yes | seen | 3,633 ms |

The application recorded the Pocket response envelope and confirmed the portal service identity for each paid response. The current supplier schema status was reported as `unchecked` by the portal response.

## Reproduction

1. Enter a crypto topic in the app.
2. Select **Run Pocket research**.
3. Confirm that the audit trail shows one search and up to two extract calls.
4. Check the source cards and the single-source warning badges.
5. Do not include wallet keys, payment signatures, or private environment values in screenshots or logs.
