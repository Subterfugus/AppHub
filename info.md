# AppHub change log

Record user-visible behavior, relevant fixes and validation here for every release. Keep entries free of personal paths, names, machine inventories, credentials and private screenshots.

## 1.2.0 — 2026-10-11

- Added independent local ONNX embedding and GGUF chat model selection, native file pickers, compatibility tests, failure rollback and bundled-default reset.
- Added embeddings-only mode, CPU/context limits and optional embedding prefixes.
- Isolated vector caches by model fingerprint and prefixes; separated compatibility-test caches from library caches.
- Improved Unicode search and handling of punctuation-only queries.
- Added recovery of damaged library/preferences/job data with preserved originals and visible notices.
- Preserved package-check timestamps and cached WinGet-only entries across discovery scans.
- Added portable registration removal, watched-folder removal and cancellation of queued package operations.
- Preserved expanded activity logs during updates. Installer timeouts now mark outcomes uncertain and cancel remaining queued work.
- Tightened grounded local answers, cancellation handling, process shutdown and verification watchdogs.
- Prepared the public source repository with generic documentation, synthetic fixtures, private-data exclusions and project-only commit identity. Standardized public build/QA output paths.
- Validation: 46 unit tests; 19 hidden Electron integration checks; 7 model-swap checks; 7 packaged inference/lifecycle checks on the development build. Public-tree validation is recorded in the repository commit, without machine-specific reports.

- Public-copy validation: all 46 synthetic unit tests and 19 hidden Electron integration checks passed; runtime source matches the verified desktop build. Generated machine-specific reports remain ignored and private.

## 1.1.0 — 2026-10-10

- Added local Qwen3 4B interpretation alongside MiniLM embedding retrieval.
- Added grounded explanations, search previews, stale-answer cancellation and native model process cleanup.
- Verified CPU inference and approximately 60-second idle unloading for both models.

## 1.0.0 — 2026-10-10

- Introduced the Windows software library, app/settings search, launching and inspection.
- Added favorites, tags, hidden entries, portable tools and Steam discovery.
- Added WinGet package discovery, reviewed install/update operations and activity history.
- Added manifest export/import and package restoration.
