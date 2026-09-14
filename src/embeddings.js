export const EMBEDDING_DIMENSIONS = 192;

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "for", "from",
  "has", "have", "i", "if", "in", "is", "it", "my", "of", "on", "or", "our",
  "someone", "that", "the", "there", "this", "to", "with"
]);

const phraseAliases = new Map([
  ["air conditioning", "air_conditioner"],
  ["air conditioner", "air_conditioner"],
  ["backing up", "clog"],
  ["blocked up", "clog"],
  ["breaker box", "breaker"],
  ["central air", "air_conditioner"],
  ["does not work", "broken"],
  ["hot water", "water_heater"],
  ["no heat", "no_heat"],
  ["not working", "broken"],
  ["right away", "urgent"],
  ["service call", "repair"]
]);

const semanticAliases = {
  basin: ["sink", "plumbing"],
  blocked: ["clog", "drain", "plumbing"],
  burst: ["pipe", "leak", "plumbing", "urgent"],
  circuit: ["breaker", "electrical"],
  clog: ["drain", "plumbing"],
  cold: ["no_heat", "hvac"],
  dishwasher: ["appliance", "kitchen"],
  drain: ["plumbing", "clog"],
  dryer: ["appliance", "laundry"],
  faucet: ["sink", "plumbing", "fixture"],
  fridge: ["refrigerator", "appliance"],
  furnace: ["heating", "hvac", "no_heat"],
  leak: ["water", "pipe", "plumbing"],
  outlet: ["electrical", "wiring", "circuit"],
  oven: ["appliance", "kitchen"],
  refrigerator: ["fridge", "appliance", "kitchen"],
  sink: ["basin", "plumbing", "drain"],
  sparking: ["electrical", "wiring", "urgent"],
  thermostat: ["hvac", "heating", "cooling"],
  toilet: ["plumbing", "fixture"],
  washer: ["appliance", "laundry"],
  wiring: ["electrical", "circuit"]
};

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stem(token) {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function tokenize(text) {
  let normalized = text.toLowerCase();
  for (const [phrase, alias] of phraseAliases) normalized = normalized.replaceAll(phrase, alias);
  const baseTokens = normalized
    .replace(/[^a-z0-9_\s-]/g, " ")
    .split(/\s+/)
    .map(stem)
    .filter((token) => token.length > 1 && !stopWords.has(token));
  const expanded = [];
  for (const token of baseTokens) {
    expanded.push(token);
    if (semanticAliases[token]) expanded.push(...semanticAliases[token]);
  }
  return expanded;
}

export function embedText(text, dimensions = EMBEDDING_DIMENSIONS) {
  const tokens = tokenize(text);
  const features = [...tokens];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    features.push(`${tokens[index]}::${tokens[index + 1]}`);
  }

  const vector = new Array(dimensions).fill(0);
  for (const feature of features) {
    const hash = stableHash(feature);
    const bucket = hash % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    const weight = feature.includes("::") ? 1.35 : 1;
    vector[bucket] += sign * weight;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}

export function cosineSimilarity(left, right) {
  if (left.length !== right.length) throw new Error("Embedding dimensions must match");
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export function buildProviderChunks(providerList) {
  return providerList.flatMap((provider) => [
    {
      id: `${provider.id}:services`,
      providerId: provider.id,
      providerName: provider.name,
      type: "services",
      text: `${provider.name} provides ${provider.category} service. Specialties include ${provider.specialties.join(", ")}. ${provider.summary}`
    },
    {
      id: `${provider.id}:coverage`,
      providerId: provider.id,
      providerName: provider.name,
      type: "coverage",
      text: `${provider.name} serves ZIP codes ${provider.serviceAreas.join(", ")}. The next simulated slot is ${provider.nextSlot}, about ${provider.distanceMiles} demo miles away.`
    },
    {
      id: `${provider.id}:history`,
      providerId: provider.id,
      providerName: provider.name,
      type: "history",
      text: `${provider.name} has a synthetic quality prior of ${provider.qualityScore} out of 100 across ${provider.jobsCompleted} simulated jobs. These are demo signals, not external business claims.`
    }
  ]);
}

export function buildVectorIndex(chunks, dimensions = EMBEDDING_DIMENSIONS) {
  return chunks.map((chunk) => ({
    ...chunk,
    embedding: embedText(chunk.text, dimensions)
  }));
}

export function retrieveContext(query, index, topK = 8) {
  const queryEmbedding = embedText(query, index[0]?.embedding.length ?? EMBEDDING_DIMENSIONS);
  return index
    .map((chunk) => ({
      ...chunk,
      similarity: Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding))
    }))
    .sort((left, right) => right.similarity - left.similarity || left.id.localeCompare(right.id))
    .slice(0, topK)
    .map(({ embedding, ...chunk }) => chunk);
}
