# TaskProof — AI preflight for gigs and bounties

[**Live demo**](https://livastic-vm2-primary-20260911.github.io/taskproof-ai/) · [Source](https://github.com/livastic-vm2-primary-20260911/taskproof-ai)

> **Don't confuse a posted prize with a paycheck.** TaskProof helps freelancers and AI agents decide what a paid job *actually asks them to prove*, how much time it might cost, and what they need to verify before accepting. It does not check real wallets, prove escrow, or guarantee a contract.

## Why a standalone tool?

A competition promising $500 to one person is not a $500 job for every entrant. The common trap is skipping three expensive questions: **What work is required? What is the payout mechanism? And what's the likely net return on time?** TaskProof keeps those separate.

**Three complementary modes:**

1. **Deterministic brief preflight.** Transparent phrase-based evidence checklist and caution flags for source repos, demos, tests, social posts, transaction receipts, API keys, deposits, competitive judging, and deadlines. Explicit warnings such as "Never send private keys" are not treated as demands. These are clues, not verdicts.
2. **Open-weight AI synthesis.** The user's text is processed locally by [Xenova/flan-t5-small](https://huggingface.co/Xenova/flan-t5-small) (Apache-2.0) in a Web Worker using [Transformers.js](https://github.com/huggingface/transformers.js) and ONNX Runtime Web. The model generates a *hypothesis* about evidence, one question for the buyer, and an optional draft opening sentence. Every output is editable and must be fact checked. The tool does not send user brief text to a hosted inference endpoint.
3. **Honest chance-weighted math.** Inputs **you choose**: reward, platform fee, hours of work, direct costs, chance of selection. Equation: `(reward * (1 - fee%) * personal probability - costs) / hours`. Probability is **not** inferred from a model or from platform listing data. Output is a hypothetical estimate, not revenue.

**Export:** A local Markdown plan (no server save or client data collection).

## No remote task-processing API

The app and report processing run locally in the browser. It loads static JavaScript and locally hosted WebAssembly from GitHub Pages; on first AI use your browser downloads the FLAN-T5 model weights/configuration from Hugging Face. After caching the model in the browser, some repeat runs may work offline, subject to browser storage and origin policies. We do not guarantee complete offline availability until dependencies are cached. The app has no telemetry, analytics, log collection, account signup, checkout, cookie-based tracking, or hosted prompt API.

**Memory / performance:** The open-weight model may require a significant initial download and several hundred MB of memory. Recent desktop Chrome/Firefox are recommended. If model loading fails, deterministic checks, the calculator, and export remain available.

## Reproducible development

Node 20+, npm, no GPU required.

```bash
npm ci --ignore-scripts
npm test
npm run build
python3 -m http.server --directory docs 8000
```

Open `http://localhost:8000`. The build bundles `src/app.mjs` and `src/ai-worker.mjs` and copies the ONNX Runtime Web WASM engine to `docs/assets/ort`; no runtime script reads your local workspace files.

The `--ignore-scripts` install option avoids unnecessary optional native/accelerator install scripts; the web app uses `onnxruntime-web` WebAssembly only. Source code lives in `src/`; deterministic unit tests live in `tests/`. CI verifies committed deploy output is reproducible with the lockfile.

## Architecture

```text
src/analysis.mjs   transparent evidence/risk checks and chance-weighted math
src/app.mjs        accessible UI, manual inputs, local Markdown export
src/ai-worker.mjs  browser Web Worker; lazy-loads Apache-2.0 FLAN-T5
src/styles.css     responsive visual design
docs/              static GitHub Pages site; no backend, no login
tests/             engine and end-to-end static artifact regression tests
```

**Third-party credits:** Hugging Face Transformers.js (Apache-2.0), FLAN-T5 and its model variant (Apache-2.0), ONNX Runtime Web (MIT). Downloaded model assets remain licensed by their respective authors. Do not imply this project is endorsed by Hugging Face, Google, MLH, DEV, GitHub, or a bounty board.

## Limitations and safety

- The model can hallucinate, paraphrase instructions inaccurately, or overlook terms; it never verifies that a posting is real.
- Phrase matching has false positives and false negatives and is **not** a scam classifier.
- Public task text may contain hostile instructions; this app treats it as untrusted data and never runs code in the description.
- The probability is a subjective input. Increasing it raises the estimate mechanically, but does **not** raise your true likelihood of payment.
- We don't ask for private keys, deposit fees, wallet connections, or customer documents.
- No winners, paying customers, income, verified payouts, or financial outcomes are claimed.
- A future business hypothesis is a paid *human-verified* evidence brief for freelancers; the illustrative $9/month or $19 one-off in the UI is **not a current sale or subscription**.
- Security/legal/tax/payment decisions require independent professional judgment.

## Origin and potential challenge submission

Built from scratch in October 2026 by the AI-assisted VM2 project team. The code was created in the window of the DEV Hacktoberfest Week 2 "Side Hustle" challenge, with the model doing genuinely local text-to-text inference.

**Important:** Merely publishing this repo does not enter a competition. Formal DEV challenge submission binds a human participant to official eligibility, publicity, liability, and tax terms. It requires the actual eligible account holder's review/acceptance; we do not claim an entry, sponsorship, or prize.

## License

The code in this repository is MIT licensed. Third-party dependencies and model weights retain their own licenses.
