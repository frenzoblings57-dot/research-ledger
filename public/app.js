const $ = (selector) => document.querySelector(selector);
const form = $("#research-form");
const topicInput = $("#topic");
const runButton = $("#run-button");
const emptyState = $("#empty-state");
const loadingState = $("#loading-state");
const loadingCopy = $("#loading-copy");
const result = $("#result");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
const shortUrl = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

function renderClaims(claims) {
  const target = $("#claims");
  if (!claims?.length) {
    target.innerHTML = '<div class="claim"><p>No readable claims were returned. Check the audit trail for the Pocket response.</p></div>';
    return;
  }
  target.innerHTML = claims.map((claim) => `
    <article class="claim">
      <div>
        <p>${escapeHtml(claim.text)}</p>
        <div class="claim-meta">${claim.supportCount} supporting source${claim.supportCount === 1 ? "" : "s"} · ${claim.sourceUrls.map(shortUrl).join(" · ")}</div>
      </div>
      <span class="${claim.singleSource ? "claim-flag" : "claim-verified"}">${claim.singleSource ? "SINGLE SOURCE" : "MULTI-SOURCE"}</span>
    </article>`).join("");
}

function renderSources(sources) {
  $("#sources").innerHTML = (sources || []).map((source) => `
    <article class="source-card">
      <div class="source-top"><strong>${escapeHtml(source.title)}</strong><span class="source-status ${source.status === "failed" ? "failed" : ""}">${source.status === "success" ? "READ" : "FAILED"}</span></div>
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(shortUrl(source.url))}</a>
      <p>${escapeHtml(source.error || source.text || "No readable content returned")}</p>
    </article>`).join("") || '<div class="claim"><p>No pages were selected from the Pocket search response.</p></div>';
}

function renderAudit(calls, pocket) {
  $("#call-count").textContent = String(calls.length);
  $("#budget-note").textContent = `$${Number(pocket.totalPaidUsd || 0).toFixed(6)} used / $${Number(pocket.totalCapUsd || 0).toFixed(6)} cap`;
  $("#audit").innerHTML = (calls || []).map((call) => `
    <div class="audit-item">
      <div class="audit-id">${escapeHtml(call.id)}</div>
      <div class="audit-main"><strong>${call.serviceId === "agentsearch-web-search-v1" ? "Pocket search" : "Pocket extract"}</strong><code>${escapeHtml(call.serviceId)} · ${escapeHtml(call.path)}</code><p>${call.paymentReceiptSeen ? "Payment receipt seen" : "Payment receipt header not exposed"} · ${call.schemaCheck ? `schema ${escapeHtml(call.schemaCheck)}` : "response inspected"}</p></div>
      <div class="audit-result"><span class="${call.status === "success" ? "ok" : "bad"}">${call.status === "success" ? "SUCCESS" : "FAILED"}</span><small>HTTP ${call.httpStatus || "—"} · ${call.elapsedMs}ms</small></div>
    </div>`).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const topic = topicInput.value.trim();
  if (topic.length < 3) return;
  runButton.disabled = true;
  runButton.querySelector("span:last-child").textContent = "Running through Pocket…";
  emptyState.classList.add("hidden");
  result.classList.add("hidden");
  loadingState.classList.remove("hidden");
  loadingCopy.textContent = "Sending the search request through agentsearch-web-search-v1.";
  try {
    const response = await fetch("/api/research", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Research run failed.");
    loadingCopy.textContent = "Pocket returned the evidence set.";
    $("#result-title").textContent = topic;
    $("#brief-text").textContent = data.brief;
    const warningBanner = $("#warning-banner");
    warningBanner.innerHTML = (data.warnings || []).map((warning) => `<div>⚠ ${escapeHtml(warning)}</div>`).join("");
    warningBanner.classList.toggle("hidden", !(data.warnings || []).length);
    renderClaims(data.claims, data.sources);
    renderSources(data.sources);
    renderAudit(data.calls, data.pocket);
    result.classList.remove("hidden");
  } catch (error) {
    $("#result-title").textContent = "Run stopped";
    $("#brief-text").textContent = error.message;
    $("#warning-banner").innerHTML = `<div>⚠ ${escapeHtml(error.message)}</div>`;
    $("#warning-banner").classList.remove("hidden");
    result.classList.remove("hidden");
  } finally {
    loadingState.classList.add("hidden");
    runButton.disabled = false;
    runButton.querySelector("span:last-child").textContent = "Run Pocket research";
  }
});
