import test from "node:test";
import assert from "node:assert/strict";
import { providers } from "../src/providers.js";
import { extractIntent, matchProviders, retrieveProviders } from "../src/matcher.js";
import { runEvaluation } from "../src/evaluation.js";
import {
  EMBEDDING_DIMENSIONS,
  buildProviderChunks,
  buildVectorIndex,
  cosineSimilarity,
  embedText,
  retrieveContext
} from "../src/embeddings.js";

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
  const candidates = retrieveProviders(intent, providers, "The furnace has no heat");
  assert.ok(candidates.length > 0);
  assert.equal(candidates[0].category, "HVAC");
  assert.ok(candidates[0].rag.similarity > 0);
});

test("creates normalized deterministic embeddings", () => {
  const first = embedText("blocked kitchen sink");
  const second = embedText("blocked kitchen sink");
  assert.equal(first.length, EMBEDDING_DIMENSIONS);
  assert.deepEqual(first, second);
  assert.ok(Math.abs(cosineSimilarity(first, first) - 1) < 1e-10);
});

test("vector retrieval returns the most relevant provider evidence", () => {
  const index = buildVectorIndex(buildProviderChunks(providers));
  const context = retrieveContext("blocked kitchen sink drain plumbing", index, 3);
  assert.equal(context[0].providerId, "blue-river-drain");
  assert.equal(index.length, providers.length * 3);
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
  assert.equal(evaluation.metrics.contextHitRate, 1);
});
