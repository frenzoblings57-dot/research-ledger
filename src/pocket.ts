import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type PocketCall = {
  id: string;
  serviceId: string;
  path: string;
  method: "POST";
  startedAt: string;
  elapsedMs: number;
  status: "success" | "failed";
  httpStatus: number;
  paid: boolean;
  paymentReceiptSeen: boolean;
  schemaCheck?: string;
  portalServiceId?: string;
  responsePreview?: string;
  error?: string;
};

export type PocketResponse = {
  json: Json;
  call: PocketCall;
};

const PORTAL_ORIGIN = "https://agent.pocket.network";
const SEARCH_PATH = "/v1/agentsearch-web-search-v1";
const EXTRACT_PATH = "/v1/agentsearch-web-extract-v1";
const CALL_PRICE_ATOMIC = 5_000;

let paidFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined;
let totalPaidAtomic = 0;
let callSequence = 0;

function getBudgetAtomic(): number {
  const value = Number.parseInt(process.env.POCKET_MAX_TOTAL_ATOMIC ?? "20000", 10);
  return Number.isFinite(value) && value > 0 ? value : 20_000;
}

function getPerCallCapAtomic(): number {
  const value = Number.parseInt(process.env.POCKET_MAX_PER_CALL_ATOMIC ?? "9000", 10);
  return Number.isFinite(value) && value > 0 ? value : 9_000;
}

function getPaidFetch() {
  if (paidFetch) return paidFetch;
  const rawKey = process.env.POCKET_PRIVATE_KEY;
  if (!rawKey) {
    throw new Error("POCKET_PRIVATE_KEY is not configured in the protected project secrets.");
  }
  const key = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);
  const client = x402Client.fromConfig({
    schemes: [
      {
        network: "eip155:8453",
        client: new ExactEvmScheme(account)
      }
    ],
    spendControls: {
      maxAmountPerPayment: `$${(getPerCallCapAtomic() / 1_000_000).toFixed(6)}`
    }
  });
  paidFetch = wrapFetchWithPayment(fetch, client);
  return paidFetch;
}

function safePreview(value: Json): string {
  try {
    const text = JSON.stringify(value);
    return text.length > 420 ? `${text.slice(0, 420)}…` : text;
  } catch {
    return "Unserializable JSON response";
  }
}

function parseJson(text: string): Json {
  try {
    return JSON.parse(text) as Json;
  } catch {
    return { raw: text.slice(0, 2_000) };
  }
}

export function getPocketConfig() {
  return {
    portalOrigin: PORTAL_ORIGIN,
    searchServiceId: "agentsearch-web-search-v1",
    extractServiceId: "agentsearch-web-extract-v1",
    searchPath: SEARCH_PATH,
    extractPath: EXTRACT_PATH,
    callPriceUsd: CALL_PRICE_ATOMIC / 1_000_000,
    totalCapUsd: getBudgetAtomic() / 1_000_000,
    perCallCapUsd: getPerCallCapAtomic() / 1_000_000,
    walletConfigured: Boolean(process.env.POCKET_PRIVATE_KEY),
    totalPaidUsd: totalPaidAtomic / 1_000_000
  };
}

export function resetPocketRun() {
  callSequence = 0;
}

export async function callPocket(
  serviceId: "agentsearch-web-search-v1" | "agentsearch-web-extract-v1",
  body: Record<string, unknown>
): Promise<PocketResponse> {
  const isSearch = serviceId === "agentsearch-web-search-v1";
  const path = isSearch ? SEARCH_PATH : EXTRACT_PATH;
  const id = `${isSearch ? "search" : "extract"}-${++callSequence}`;
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const estimatedAfterCall = totalPaidAtomic + CALL_PRICE_ATOMIC;
  if (estimatedAfterCall > getBudgetAtomic()) {
    throw new Error(`Pocket test budget reached. The next call would exceed the configured $${(getBudgetAtomic() / 1_000_000).toFixed(6)} cap.`);
  }

  let response: Response | undefined;
  try {
    response = await getPaidFetch()(PORTAL_ORIGIN + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const raw = await response.text();
    const json = parseJson(raw);
    const envelope = json && typeof json === "object" && !Array.isArray(json) ? json as Record<string, unknown> : {};
    const portal = envelope.portal && typeof envelope.portal === "object" ? envelope.portal as Record<string, unknown> : undefined;
    const paymentReceiptSeen = Boolean(response.headers.get("PAYMENT-RESPONSE"));
    const paid = response.ok && Boolean(portal?.provenance === "third-party-supplier");
    if (paid) totalPaidAtomic += CALL_PRICE_ATOMIC;
    const call: PocketCall = {
      id,
      serviceId,
      path,
      method: "POST",
      startedAt,
      elapsedMs: Date.now() - start,
      status: response.ok ? "success" : "failed",
      httpStatus: response.status,
      paid,
      paymentReceiptSeen,
      schemaCheck: typeof portal?.schemaCheck === "string" ? portal.schemaCheck : undefined,
      portalServiceId: typeof portal?.serviceId === "string" ? portal.serviceId : undefined,
      responsePreview: safePreview(json),
      error: response.ok ? undefined : `Pocket returned HTTP ${response.status}`
    };
    if (!response.ok) {
      const errorObject = envelope.error && typeof envelope.error === "object" ? envelope.error as Record<string, unknown> : undefined;
      call.error = typeof errorObject?.message === "string" ? errorObject.message : call.error;
    }
    return { json, call };
  } catch (error) {
    return {
      json: { error: { code: "CLIENT_ERROR", message: error instanceof Error ? error.message : "Unknown Pocket client error" } },
      call: {
        id,
        serviceId,
        path,
        method: "POST",
        startedAt,
        elapsedMs: Date.now() - start,
        status: "failed",
        httpStatus: response?.status ?? 0,
        paid: false,
        paymentReceiptSeen: false,
        error: error instanceof Error ? error.message : "Unknown Pocket client error"
      }
    };
  }
}
