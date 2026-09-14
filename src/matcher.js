const categoryRules = [
  ["Plumbing", ["leak", "pipe", "sink", "toilet", "drain", "clog", "sewer", "faucet", "water"]],
  ["HVAC", ["heat", "cold", "furnace", "thermostat", "air conditioner", "ac ", "airflow"]],
  ["Electrical", ["outlet", "breaker", "sparking", "wiring", "electrical", "light switch"]],
  ["Appliance", ["refrigerator", "fridge", "washer", "dryer", "dishwasher", "oven", "appliance"]],
  ["Handyman", ["drywall", "door", "assembly", "mount", "fixture", "repair"]]
];

const specialtyTerms = [
  "leak", "faucet", "sink", "toilet", "pipe", "drain", "clog", "sewer", "backup",
  "no heat", "air conditioner", "thermostat", "furnace", "airflow", "outlet", "breaker",
  "light", "sparking", "wiring", "refrigerator", "washer", "dryer", "dishwasher", "oven",
  "drywall", "door", "assembly", "fixture"
];

const titleCase = (value) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

export function extractIntent(description, zip = "66502") {
  const normalized = description.toLowerCase().replace(/\s+/g, " ").trim();
  const categoryScores = categoryRules.map(([category, terms]) => ({
    category,
    matches: terms.filter((term) => normalized.includes(term))
  }));
  categoryScores.sort((a, b) => b.matches.length - a.matches.length);
  const winner = categoryScores[0];
  const category = winner.matches.length ? winner.category : "Handyman";

  const matchedSpecialties = specialtyTerms.filter((term) => normalized.includes(term));
  const urgency = /sparking|burst|flood|no heat|backup|emergency/.test(normalized)
    ? "Urgent"
    : /today|asap|right away|getting worse|stopped working/.test(normalized)
      ? "Today"
      : "Flexible";

  const safetyFlag = /sparking|smoke|gas smell|flood|burst/.test(normalized);
  const jobType = matchedSpecialties[0]
    ? titleCase(matchedSpecialties[0])
    : category === "Handyman" ? "General Repair" : `${category} Diagnosis`;
  const confidence = Math.min(98, 68 + winner.matches.length * 8 + (matchedSpecialties.length ? 5 : 0));

  return {
    category,
    jobType,
    urgency,
    zip,
    specialties: [...new Set(matchedSpecialties)].slice(0, 4),
    safetyFlag,
    confidence,
    mode: "Local mock extractor"
  };
}

export function retrieveProviders(intent, providerList, description = "") {
  const chunks = buildProviderChunks(providerList);
  const index = buildVectorIndex(chunks);
  const eligibleProviderIds = new Set(
    providerList
      .filter((provider) => provider.serviceAreas.includes(intent.zip))
      .map((provider) => provider.id)
  );
  const eligibleIndex = index.filter((chunk) => (
    eligibleProviderIds.has(chunk.providerId) && chunk.type === "services"
  ));
  const query = [description, intent.category, intent.jobType, ...intent.specialties].join(" ");
  const context = retrieveContext(query, eligibleIndex.length ? eligibleIndex : index, 10);
  const bestContextByProvider = new Map();

  for (const chunk of context) {
    const current = bestContextByProvider.get(chunk.providerId);
    if (!current || chunk.similarity > current.similarity) bestContextByProvider.set(chunk.providerId, chunk);
  }

  const vectorMatches = new Set(context.slice(0, 8).map((chunk) => chunk.providerId));
  let candidates = providerList.filter((provider) => {
    const servesArea = provider.serviceAreas.includes(intent.zip);
    return servesArea && (provider.category === intent.category || vectorMatches.has(provider.id));
  });

  if (!candidates.length) {
    candidates = providerList.filter((provider) => provider.category === intent.category);
  }
  if (!candidates.length) candidates = providerList.filter((provider) => provider.category === "Handyman");

  candidates = candidates
    .map((provider) => ({
      ...provider,
      rag: bestContextByProvider.get(provider.id) ?? {
        id: `${provider.id}:fallback`,
        providerId: provider.id,
        providerName: provider.name,
        type: "fallback",
        text: provider.summary,
        similarity: 0
      }
    }))
    .sort((left, right) => right.rag.similarity - left.rag.similarity);

  candidates.context = context;
  candidates.indexSize = index.length;
  candidates.searchSize = eligibleIndex.length;
  candidates.dimensions = EMBEDDING_DIMENSIONS;
  candidates.query = query;
  return candidates;
}

function scoreProvider(provider, intent) {
  const category = provider.category === intent.category ? 30 : 12;
  const overlap = intent.specialties.filter((skill) => provider.specialties.includes(skill));
  const specialty = Math.min(18, overlap.length * 9);
  const semantic = Math.round(Math.min(24, provider.rag.similarity * 42));
  const location = provider.serviceAreas.includes(intent.zip) ? 10 : 2;
  const urgencyWindow = intent.urgency === "Urgent" ? 4 : intent.urgency === "Today" ? 8 : 30;
  const availability = Math.max(0, 14 - Math.max(0, provider.availabilityHours - urgencyWindow) * 1.3);
  const quality = provider.qualityScore / 11;
  const distancePenalty = Math.min(6, provider.distanceMiles * 0.28);
  const raw = category + specialty + semantic + location + availability + quality - distancePenalty;
  const score = Math.max(0, Math.min(99, Math.round(raw)));

  const reasons = [];
  if (provider.rag.similarity > 0) reasons.push(`Vector search retrieved a ${provider.rag.type} passage at ${Math.round(provider.rag.similarity * 100)}% similarity`);
  if (overlap.length) reasons.push(`Direct match for ${overlap.slice(0, 2).join(" and ")}`);
  else if (provider.category === intent.category) reasons.push(`Specializes in ${intent.category.toLowerCase()} work`);
  if (provider.serviceAreas.includes(intent.zip)) reasons.push(`Serves ${intent.zip}`);
  if (provider.availabilityHours <= urgencyWindow) reasons.push(`${provider.nextSlot} fits the ${intent.urgency.toLowerCase()} window`);
  if (provider.qualityScore >= 92) reasons.push("Strong demo quality history in the seed set");

  return {
    ...provider,
    score,
    overlap,
    reasons: reasons.slice(0, 3),
    signals: {
      category,
      specialty,
      semantic,
      availability: Math.round(availability),
      location,
      quality: Math.round(quality),
      distancePenalty: Math.round(distancePenalty)
    }
  };
}

export function rankProviders(intent, candidates) {
  return candidates
    .map((provider) => scoreProvider(provider, intent))
    .sort((a, b) => b.score - a.score || a.distanceMiles - b.distanceMiles);
}

export function matchProviders(description, zip, providerList) {
  const intent = extractIntent(description, zip);
  const retrieved = retrieveProviders(intent, providerList, description);
  const ranked = rankProviders(intent, retrieved);
  return {
    intent,
    retrievedCount: retrieved.length,
    ranked,
    retrieval: {
      query: retrieved.query,
      chunks: retrieved.context.slice(0, 5),
      indexSize: retrieved.indexSize,
      searchSize: retrieved.searchSize,
      dimensions: retrieved.dimensions
    }
  };
}
import {
  EMBEDDING_DIMENSIONS,
  buildProviderChunks,
  buildVectorIndex,
  retrieveContext
} from "./embeddings.js";
