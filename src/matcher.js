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

export function retrieveProviders(intent, providerList) {
  const categoryMatches = providerList.filter((provider) => provider.category === intent.category);
  const adjacentMatches = providerList.filter((provider) => {
    const skillMatch = intent.specialties.some((skill) => provider.specialties.includes(skill));
    return provider.category !== intent.category && skillMatch;
  });
  const candidates = [...categoryMatches, ...adjacentMatches];
  return candidates.length ? candidates : providerList.filter((provider) => provider.category === "Handyman");
}

function scoreProvider(provider, intent) {
  const category = provider.category === intent.category ? 38 : 16;
  const overlap = intent.specialties.filter((skill) => provider.specialties.includes(skill));
  const specialty = Math.min(24, overlap.length * 12);
  const location = provider.serviceAreas.includes(intent.zip) ? 12 : 2;
  const urgencyWindow = intent.urgency === "Urgent" ? 4 : intent.urgency === "Today" ? 8 : 30;
  const availability = Math.max(0, 16 - Math.max(0, provider.availabilityHours - urgencyWindow) * 1.5);
  const quality = provider.qualityScore / 10;
  const distancePenalty = Math.min(8, provider.distanceMiles * 0.32);
  const raw = category + specialty + location + availability + quality - distancePenalty;
  const score = Math.max(0, Math.min(99, Math.round(raw)));

  const reasons = [];
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
  const retrieved = retrieveProviders(intent, providerList);
  const ranked = rankProviders(intent, retrieved);
  return { intent, retrievedCount: retrieved.length, ranked };
}
