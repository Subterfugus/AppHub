# Reproducing the model and Electron QA

Run these commands from the AppHub source folder on Windows 11 x64 with Node.js 24 or later, npm, and WinGet. Follow the root README for the production build prerequisites. The alternative models below are optional QA fixtures, approximately **1.14 GB** in total; they are not required by the production application and are not bundled defaults.

Prepare the source dependencies, bundled models, native CPU runtime, and optional fixtures:

```powershell
npm ci
node node_modules/electron/install.js
npm run prepare-model
node scripts/prepare-reasoner.cjs
node scripts/prepare-test-models.cjs
```

The last command downloads only the six pinned fixture files into `.qa/extra-models`, inside the source folder. It skips files whose size and SHA256 already match. Downloads go to `.partial` files and must pass verification before replacing a destination. An unsuccessful download leaves the destination intact and exits with a nonzero status. AppHub itself never downloads these fixtures.

To check assets already present, without downloading or writing anything:

```powershell
node scripts/prepare-test-models.cjs --verify-only
```

Verification checks all six files, reports any missing or mismatched file, and exits with a nonzero status on failure. A successful run prints `All six optional QA files verified; no downloads or writes.`

## Pinned alternative models

| QA role | Publisher repository | Revision | Local path under `.qa/extra-models` |
| --- | --- | --- | --- |
| Embedding | [Xenova/paraphrase-MiniLM-L3-v2](https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2/tree/4b544e74dfc3256b2b56849ea5d7064fee1ac846) | `4b544e74dfc3256b2b56849ea5d7064fee1ac846` | `paraphrase-MiniLM-L3-v2/` |
| Interpretation | [Qwen/Qwen2.5-1.5B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/tree/91cad51170dc346986eccefdc2dd33a9da36ead9) | `91cad51170dc346986eccefdc2dd33a9da36ead9` | `qwen2.5-1.5b-instruct-q4_k_m.gguf` |

The embedding fixture includes `config.json`, `special_tokens_map.json`, `tokenizer_config.json`, `tokenizer.json`, and `onnx/model_quantized.onnx`. Exact SHA256 values and byte lengths for every file are committed in `scripts/prepare-test-models.cjs`. The Qwen publisher filename is lowercase; the script preserves that spelling.

## Run the checks

```powershell
npm test
node scripts/qa-main-errors.cjs
node scripts/qa-ui-audit.cjs
node scripts/qa-model-swaps.cjs
node scripts/qa-electron.cjs
npm run build
node scripts/qa-packaged-search.cjs
```

`qa-main-errors.cjs` deliberately throws an exception and rejects a promise in isolated Electron processes; each must exit with failure without calling the native error dialog. The runner itself exits successfully when both checks pass. `qa-model-swaps.cjs` exercises real alternative embedding and interpretation inference, model activation, separate vector caches, failed-model recovery, and restoration of bundled defaults. `qa-electron.cjs` exercises the application through Electron and its real interfaces. `qa-packaged-search.cjs` checks the built application and bundled CPU models, including process cleanup after the 60-second idle period. Allow several minutes for the inference and idle checks. Each runner must exit with status 0.

The packaged check defaults to `dist/win-unpacked`, relative to the source folder. To test a different extracted application folder:

```powershell
node scripts/qa-packaged-search.cjs "C:\path\to\win-unpacked"
```

Reports are written under `qa-output`: `model-swaps-report.json`, `integration-report.json`, and `packaged-search-report.json`. Model-swap test data and vector caches live in `.qa/models-data`; Electron checks use their own test data locations recorded in the reports. Unit tests use synthetic inventory fixtures. QA output can contain local machine information; qa-output/ and .qa/ are ignored and must stay private.
