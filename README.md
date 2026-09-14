# AI Provider Match

AI Provider Match is a focused retrieval-augmented generation demo for the NewsBreak Nearby AI Engineering Track. It turns a plain-language home-service problem into structured intent, embeds the request, retrieves provider evidence from a local vector index, ranks eligible providers, and grounds each recommendation in cited context.

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

The tests cover intent extraction, deterministic embeddings, vector-index construction, cosine retrieval, safety signals, hybrid ranking, and the evaluation suite.

## Architecture

- `src/embeddings.js` chunks provider knowledge, creates normalized 192-dimensional feature-hash embeddings, builds the in-memory vector index, and performs cosine top-k retrieval.
- `src/matcher.js` contains the extraction, retrieval, scoring, and explanation pipeline.
- `src/providers.js` contains the fictional local seed directory and example requests.
- `src/evaluation.js` calculates Recall@3, NDCG@3, mean reciprocal rank, and intent accuracy from labeled scenarios.
- `src/app.js` handles rendering and interaction without coupling the UI to external services.

The local embedding adapter is the safe default and makes every result reproducible. It uses feature hashing with synonym expansion, not a hosted neural model. A production implementation can replace `embedText` with OpenAI, Cohere, Voyage, or another embedding endpoint while preserving the chunking, retrieval, ranking, and evaluation boundaries. No API key is required or stored by this project.

## RAG pipeline

1. Provider profiles become service, coverage, and synthetic-history chunks.
2. Each chunk is embedded and stored in an in-memory vector index.
3. The request and extracted intent become a normalized query vector.
4. Cosine similarity retrieves the closest provider evidence.
5. A hybrid ranker combines vector relevance with trade, specialty, availability, coverage, quality, and distance signals.
6. Recommendation reasons cite the retrieved chunk that grounded the match.

## Ranking signals

Providers are scored on vector similarity, service-category fit, specialty overlap, availability, service-area eligibility, a synthetic quality prior, and a small distance adjustment. The interface exposes the retrieved passages, cosine scores, grounded recommendation reasons, and underlying ranking signals.

## Scope notes

This is an engineering demo, not a booking marketplace. It does not accept payments, create appointments, verify credentials, or represent any provider as a real business. A launchable service would also require provider verification, user accounts, consent and retention policies, a privacy policy, and terms of service.
