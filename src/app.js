import { exampleRequests, providers } from "./providers.js";
import { matchProviders } from "./matcher.js";
import { runEvaluation } from "./evaluation.js";

const $ = (selector) => document.querySelector(selector);
const formatPercent = (value) => `${Math.round(value * 100)}%`;

const elements = {
  form: $("#matchForm"),
  request: $("#requestInput"),
  zip: $("#zipInput"),
  count: $("#characterCount"),
  button: $("#matchButton"),
  loading: $("#loadingState"),
  loadingTitle: $("#loadingTitle"),
  loadingDetail: $("#loadingDetail"),
  results: $("#resultsSection"),
  intent: $("#intentGrid"),
  confidence: $("#confidenceLabel"),
  retrievalSummary: $("#retrievalSummary"),
  providers: $("#providerResults"),
  safety: $("#safetyNotice")
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderExamples() {
  const container = $("#exampleButtons");
  exampleRequests.forEach((example) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-button";
    button.textContent = example.label;
    button.addEventListener("click", () => {
      elements.request.value = example.text;
      elements.zip.value = example.zip;
      updateCharacterCount();
      elements.request.focus();
    });
    container.append(button);
  });
}

function updateCharacterCount() {
  elements.count.textContent = `${elements.request.value.length} / 500`;
}

function setPipeline(stage, status) {
  const order = ["understand", "retrieve", "rank", "explain"];
  order.forEach((name, index) => {
    const item = document.querySelector(`[data-stage="${name}"]`);
    const currentIndex = order.indexOf(stage);
    item.classList.toggle("is-active", index === currentIndex && status === "active");
    item.classList.toggle("is-complete", index < currentIndex || (index === currentIndex && status === "complete"));
    item.querySelector(".stage-status").textContent = index < currentIndex || (index === currentIndex && status === "complete")
      ? "Done"
      : index === currentIndex && status === "active" ? "Working" : "Waiting";
  });
}

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function animatePipeline() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = reducedMotion ? 20 : 230;
  const stages = [
    ["understand", "Reading the request", "Turning natural language into service requirements…"],
    ["retrieve", "Retrieving candidates", "Filtering the local seed directory by trade and service area…"],
    ["rank", "Scoring provider fit", "Comparing specialty, timing, location, quality, and distance…"],
    ["explain", "Preparing explanations", "Selecting the strongest evidence for each recommendation…"]
  ];
  for (const [stage, title, detail] of stages) {
    setPipeline(stage, "active");
    elements.loadingTitle.textContent = title;
    elements.loadingDetail.textContent = detail;
    await wait(delay);
  }
  setPipeline("explain", "complete");
}

function renderIntent(intent) {
  const fields = [
    ["Service", intent.category],
    ["Job type", intent.jobType],
    ["Timing", intent.urgency],
    ["Service area", intent.zip]
  ];
  elements.intent.innerHTML = fields.map(([label, value]) => `
    <div class="intent-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");
  elements.confidence.textContent = `${intent.confidence}% extraction confidence`;
  elements.safety.hidden = !intent.safetyFlag;
  elements.safety.innerHTML = intent.safetyFlag
    ? "<strong>Safety signal detected.</strong> If there is active smoke, gas, fire, or flooding, contact emergency services or the relevant utility before booking routine service."
    : "";
}

function signalRow(signals) {
  const values = [
    ["Trade", signals.category],
    ["Need", signals.specialty],
    ["Timing", signals.availability],
    ["Area", signals.location],
    ["Prior", signals.quality]
  ];
  return values.map(([label, value]) => `
    <div class="signal"><span>${label}</span><div><i style="--signal:${Math.max(3, value)}%"></i></div><strong>${value}</strong></div>
  `).join("");
}

function renderProviders(ranked) {
  elements.providers.innerHTML = ranked.slice(0, 3).map((provider, index) => `
    <article class="provider-card ${index === 0 ? "is-top" : ""}">
      <div class="provider-rank"><span>${String(index + 1).padStart(2, "0")}</span>${index === 0 ? "Best fit" : "Strong alternative"}</div>
      <div class="provider-main">
        <div class="provider-title-row">
          <div>
            <h3>${escapeHtml(provider.name)}</h3>
            <p>${escapeHtml(provider.category)} · ${provider.distanceMiles.toFixed(1)} demo miles away</p>
          </div>
          <div class="match-score"><strong>${provider.score}</strong><span>match</span></div>
        </div>
        <p class="provider-summary">${escapeHtml(provider.summary)}</p>
        <div class="provider-meta">
          <span><strong>${escapeHtml(provider.nextSlot)}</strong> next demo slot</span>
          <span><strong>${provider.qualityScore}/100</strong> demo quality prior</span>
          <span><strong>${provider.jobsCompleted}</strong> simulated jobs</span>
        </div>
      </div>
      <div class="provider-evidence">
        <p class="evidence-title">Why this match</p>
        <ul>${provider.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
        <details>
          <summary>View score signals</summary>
          <div class="signals">${signalRow(provider.signals)}</div>
          <p class="score-note">Distance applies a −${provider.signals.distancePenalty} adjustment. Scores compare this synthetic candidate set only.</p>
        </details>
      </div>
    </article>
  `).join("");
}

async function runMatch(event) {
  event?.preventDefault();
  const description = elements.request.value.trim();
  if (description.length < 12) {
    elements.request.setCustomValidity("Please add a little more detail about the problem.");
    elements.request.reportValidity();
    return;
  }
  elements.request.setCustomValidity("");
  elements.button.disabled = true;
  elements.results.hidden = true;
  elements.loading.hidden = false;
  await animatePipeline();
  const result = matchProviders(description, elements.zip.value, providers);
  renderIntent(result.intent);
  renderProviders(result.ranked);
  elements.retrievalSummary.textContent = `${result.retrievedCount} eligible providers retrieved · top 3 shown`;
  elements.loading.hidden = true;
  elements.results.hidden = false;
  elements.button.disabled = false;
  elements.results.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

function renderEvaluation() {
  const { metrics, rows } = runEvaluation();
  const metricItems = [
    ["Recall@3", metrics.recallAt3, "Relevant providers found in the first three results"],
    ["NDCG@3", metrics.ndcgAt3, "Ranking quality with earlier relevant results weighted higher"],
    ["MRR", metrics.mrr, "How early the first relevant provider appears"],
    ["Intent accuracy", metrics.intentAccuracy, "Requests assigned to the expected service category"]
  ];
  $("#metricGrid").innerHTML = metricItems.map(([label, value, detail]) => `
    <article class="metric-card"><span>${label}</span><strong>${formatPercent(value)}</strong><p>${detail}</p></article>
  `).join("");
  $("#evaluationRows").innerHTML = rows.map((row) => `
    <tr>
      <td><strong>${row.id.toUpperCase()}</strong><span>${escapeHtml(row.request)}</span></td>
      <td>${row.expectedCategory}</td>
      <td>${escapeHtml(row.topMatch)}</td>
      <td>${formatPercent(row.recall)}</td>
      <td>${formatPercent(row.ndcg)}</td>
      <td><span class="pass-badge">${row.passed ? "Pass" : "Review"}</span></td>
    </tr>
  `).join("");
}

function showView(name) {
  const isMatch = name === "match";
  $("#matchView").hidden = !isMatch;
  $("#evaluationView").hidden = isMatch;
  $("#matchTab").classList.toggle("is-active", isMatch);
  $("#evaluationTab").classList.toggle("is-active", !isMatch);
  $("#matchTab").setAttribute("aria-selected", String(isMatch));
  $("#evaluationTab").setAttribute("aria-selected", String(!isMatch));
}

renderExamples();
renderEvaluation();
updateCharacterCount();
elements.request.addEventListener("input", updateCharacterCount);
elements.form.addEventListener("submit", runMatch);
$("#matchTab").addEventListener("click", () => showView("match"));
$("#evaluationTab").addEventListener("click", () => showView("evaluation"));
$("#aboutButton").addEventListener("click", () => $("#aboutDialog").showModal());
$("#closeDialog").addEventListener("click", () => $("#aboutDialog").close());
$("#aboutDialog").addEventListener("click", (event) => {
  if (event.target === $("#aboutDialog")) $("#aboutDialog").close();
});
