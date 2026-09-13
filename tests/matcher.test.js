import test from "node:test";
import assert from "node:assert/strict";
import { providers } from "../src/providers.js";
import { extractIntent, matchProviders, retrieveProviders } from "../src/matcher.js";
import { runEvaluation } from "../src/evaluation.js";

test("extracts plumbing intent and same-day urgency", () => {
  const intent = extractIntent("My kitchen sink has a leak and I need help today", "66502");
  assert.equal(intent.category, "Plumbing");
  assert.equal(intent.urgency, "Today");
  assert.ok(intent.specialties.includes("sink"));
  assert.ok(intent.specialties.includes("leak"));
});

test("flags safety-sensitive electrical language", () => {
  const intent = extractIntent("There is smoke and sparking near an outlet", "66503");
  assert.equal(intent.category, "Electrical");
  assert.equal(intent.urgency, "Urgent");
  assert.equal(intent.safetyFlag, true);
});

test("retrieval stays focused on the inferred trade", () => {
  const intent = extractIntent("The furnace has no heat", "66503");
  const candidates = retrieveProviders(intent, providers);
  assert.ok(candidates.length > 0);
  assert.ok(candidates.every((provider) => provider.category === "HVAC" || provider.specialties.includes("no heat")));
});

test("ranks the drain specialist first for a backed-up sink", () => {
  const result = matchProviders("Kitchen sink drain is clogged and backing up today", "66502", providers);
  assert.equal(result.ranked[0].id, "blue-river-drain");
  assert.ok(result.ranked[0].reasons.length >= 2);
});

test("evaluation suite retrieves a relevant provider in every case", () => {
  const evaluation = runEvaluation();
  assert.equal(evaluation.rows.every((row) => row.passed), true);
  assert.equal(evaluation.metrics.recallAt3, 1);
  assert.equal(evaluation.metrics.intentAccuracy, 1);
});
