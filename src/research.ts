import { callPocket, getPocketConfig, resetPocketRun, type PocketCall } from "./pocket.js";

type AnyRecord = Record<string, unknown>;

type SearchSource = {
  url: string;
  title: string;
  snippet: string;
};

type ExtractedSource = SearchSource & {
  text: string;
  status: "success" | "failed";
  callId: string;
  error?: string;
};

export type ResearchResult = {
  topic: string;
  createdAt: string;
  pocket: ReturnType<typeof getPocketConfig>;
  calls: PocketCall[];
  searchResults: SearchSource[];
  sources: ExtractedSource[];
  claims: Array<{
    text: string;
    sourceUrls: string[];
    supportCount: number;
    singleSource: boolean;
  }>;
  brief: string;
  warnings: string[];
};

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AnyRecord : undefined;
}

function unwrap(json: unknown): unknown {
  const record = asRecord(json);
  if (record?.data !== undefined) return record.data;
  return json;
}

function firstString(record: AnyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function collectUrlRecords(value: unknown, output: AnyRecord[] = []): AnyRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) collectUrlRecords(item, output);
    return output;
  }
  const record = asRecord(value);
  if (!record) return output;
  const url = firstString(record, ["url", "link", "href", "source_url"]);
  if (/^https?:\/\//i.test(url)) output.push(record);
  for (const child of Object.values(record)) {
    if (child && typeof child === "object") collectUrlRecords(child, output);
  }
  return output;
}

function normalizeSearch(json: unknown): SearchSource[] {
  const seen = new Set<string>();
  return collectUrlRecords(unwrap(json))
    .map((record) => ({
      url: firstString(record, ["url", "link", "href", "source_url"]),
      title: firstString(record, ["title", "name", "headline"]) || "Untitled source",
      snippet: firstString(record, ["snippet", "description", "summary", "text"])
    }))
    .filter((source) => {
      if (!source.url || seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });
}

function collectText(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string" && value.trim().length > 80) {
    output.push(value.trim());
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, output);
    return output;
  }
  const record = asRecord(value);
  if (record) {
    for (const [key, child] of Object.entries(record)) {
      if (["markdown", "text", "content", "body", "excerpt", "title"].includes(key.toLowerCase())) {
        collectText(child, output);
      } else if (child && typeof child === "object") {
        collectText(child, output);
      }
    }
  }
  return output;
}

function cleanPageText(text: string): string {
  const lines = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headingIndex = lines.findIndex((line) => /^#\s+[^#]/.test(line));
  const content = headingIndex >= 0 ? lines.slice(headingIndex) : lines;
  const blocked = /^(skip to main content|menu|promotions?|buy crypto|buy\/sell crypto|spend crypto|markets|features|login|sign up|search)$/i;
  return content
    .filter((line) => !blocked.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => !/^\[[^\]]*\]\s*$/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
}

function extractText(json: unknown): string {
  const pieces = collectText(unwrap(json));
  const cleaned = pieces.map(cleanPageText).filter((piece) => piece.length > 80);
  return cleaned.sort((a, b) => b.length - a.length)[0] ?? "";
}

function sentenceCandidates(text: string): string[] {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#*_>`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 55 && sentence.length <= 320)
    .filter((sentence) => !/^https?:\/\//i.test(sentence))
    .slice(0, 2);
}

function normalizeClaim(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 130);
}

function buildClaims(sources: ExtractedSource[]) {
  const grouped = new Map<string, { text: string; sourceUrls: Set<string> }>();
  for (const source of sources) {
    if (source.status !== "success") continue;
    for (const text of sentenceCandidates(source.text)) {
      const key = normalizeClaim(text);
      if (!key) continue;
      const existing = grouped.get(key) ?? { text, sourceUrls: new Set<string>() };
      existing.sourceUrls.add(source.url);
      grouped.set(key, existing);
    }
  }
  return [...grouped.values()].slice(0, 8).map((claim) => ({
    text: claim.text,
    sourceUrls: [...claim.sourceUrls],
    supportCount: claim.sourceUrls.size,
    singleSource: claim.sourceUrls.size < 2
  }));
}

function sourceFromExtract(searchSource: SearchSource, json: unknown, call: PocketCall): ExtractedSource {
  const payload = unwrap(json);
  const text = extractText(payload);
  const record = asRecord(payload);
  const title = firstString(record ?? {}, ["title"]) || searchSource.title;
  return {
    ...searchSource,
    title,
    text,
    status: call.status,
    callId: call.id,
    error: call.error
  };
}

export async function runResearch(topic: string): Promise<ResearchResult> {
  resetPocketRun();
  const calls: PocketCall[] = [];
  const warnings: string[] = [];
  const search = await callPocket("agentsearch-web-search-v1", { query: topic, max_results: 6 });
  calls.push(search.call);
  const searchResults = search.call.status === "success" ? normalizeSearch(search.json) : [];
  if (!searchResults.length) warnings.push("Pocket search returned no usable public URLs.");

  const selected = searchResults.slice(0, 2);
  const sources: ExtractedSource[] = [];
  for (const source of selected) {
    const extracted = await callPocket("agentsearch-web-extract-v1", {
      url: source.url,
      formats: ["markdown", "text"],
      max_chars: 8_000
    });
    calls.push(extracted.call);
    const normalized = sourceFromExtract(source, extracted.json, extracted.call);
    if (!normalized.text) warnings.push(`No readable text was returned for ${source.url}.`);
    sources.push(normalized);
  }

  const claims = buildClaims(sources);
  const singleSourceCount = claims.filter((claim) => claim.singleSource).length;
  if (singleSourceCount) warnings.push(`${singleSourceCount} finding${singleSourceCount === 1 ? " is" : "s are"} supported by only one source and should be verified.`);
  const successful = sources.filter((source) => source.status === "success");
  const brief = successful.length
    ? `Research on “${topic}” used ${successful.length} readable source${successful.length === 1 ? "" : "s"}. ${claims.slice(0, 3).map((claim) => claim.text).join(" ")}`
    : "No source-backed brief could be produced because Pocket did not return readable pages.";

  return {
    topic,
    createdAt: new Date().toISOString(),
    pocket: getPocketConfig(),
    calls,
    searchResults,
    sources,
    claims,
    brief,
    warnings
  };
}
