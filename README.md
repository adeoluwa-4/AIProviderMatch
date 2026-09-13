# AI Provider Match

AI Provider Match is a focused browser demo for the NewsBreak Nearby AI Engineering Track. It turns a plain-language home-service problem into structured intent, retrieves eligible local providers, ranks them with inspectable signals, and explains each recommendation.

The app uses a fictional Manhattan, Kansas provider directory. Names, availability, distances, job counts, and quality scores are synthetic demo data, not claims about real businesses.

## Run locally

Requirements: Python 3 and Node.js 20 or newer.

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

## Test

```bash
npm test
```

The tests cover intent extraction, safety signals, retrieval boundaries, ranking behavior, and the evaluation suite.

## Architecture

- `src/matcher.js` contains the extraction, retrieval, scoring, and explanation pipeline.
- `src/providers.js` contains the fictional local seed directory and example requests.
- `src/evaluation.js` calculates Recall@3, NDCG@3, mean reciprocal rank, and intent accuracy from labeled scenarios.
- `src/app.js` handles rendering and interaction without coupling the UI to external services.

Mock mode is the safe default and makes every result reproducible. A production implementation can replace the intent extractor and provider data source while preserving the same module boundaries. No API key is required or stored by this project.

## Ranking signals

Providers are scored on service-category fit, specialty overlap, availability, service-area eligibility, a synthetic quality prior, and a small distance adjustment. The interface exposes the strongest recommendation reasons and the underlying signal values.

## Scope notes

This is an engineering demo, not a booking marketplace. It does not accept payments, create appointments, verify credentials, or represent any provider as a real business. A launchable service would also require provider verification, user accounts, consent and retention policies, a privacy policy, and terms of service.
