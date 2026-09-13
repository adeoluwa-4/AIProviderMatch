import { providers } from "./providers.js";
import { matchProviders } from "./matcher.js";

export const evaluationCases = [
  {
    id: "eval-01",
    request: "Kitchen sink drain is backing up and I need help today.",
    zip: "66502",
    relevant: ["blue-river-drain", "prairie-pipe"],
    expectedCategory: "Plumbing"
  },
  {
    id: "eval-02",
    request: "Our furnace is running but there is no heat from the vents.",
    zip: "66503",
    relevant: ["little-apple-climate"],
    expectedCategory: "HVAC"
  },
  {
    id: "eval-03",
    request: "An outlet started sparking after the breaker tripped.",
    zip: "66502",
    relevant: ["tallgrass-electric"],
    expectedCategory: "Electrical"
  },
  {
    id: "eval-04",
    request: "Dishwasher will not drain and can be looked at this week.",
    zip: "66506",
    relevant: ["konza-appliance"],
    expectedCategory: "Appliance"
  }
];

function dcg(relevances) {
  return relevances.reduce((sum, relevance, index) => sum + relevance / Math.log2(index + 2), 0);
}

export function runEvaluation() {
  const rows = evaluationCases.map((testCase) => {
    const result = matchProviders(testCase.request, testCase.zip, providers);
    const topThree = result.ranked.slice(0, 3);
    const hits = topThree.filter((provider) => testCase.relevant.includes(provider.id)).length;
    const recall = hits / testCase.relevant.length;
    const relevances = topThree.map((provider) => testCase.relevant.includes(provider.id) ? 1 : 0);
    const ideal = Array.from({ length: Math.min(3, testCase.relevant.length) }, () => 1);
    const ndcg = dcg(relevances) / (dcg(ideal) || 1);
    const firstRelevantIndex = topThree.findIndex((provider) => testCase.relevant.includes(provider.id));
    const reciprocalRank = firstRelevantIndex === -1 ? 0 : 1 / (firstRelevantIndex + 1);
    return {
      ...testCase,
      predictedCategory: result.intent.category,
      topMatch: topThree[0]?.name ?? "None",
      recall,
      ndcg,
      reciprocalRank,
      passed: result.intent.category === testCase.expectedCategory && hits > 0
    };
  });

  const average = (key) => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
  return {
    rows,
    metrics: {
      recallAt3: average("recall"),
      ndcgAt3: average("ndcg"),
      mrr: average("reciprocalRank"),
      intentAccuracy: rows.filter((row) => row.predictedCategory === row.expectedCategory).length / rows.length
    }
  };
}
