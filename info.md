# AppHub change log

Record user-visible behavior, relevant fixes and validation here for every release. Keep entries free of personal paths, names, machine inventories, credentials and private screenshots.

## 1.2.2 — 2026-10-11

- Contained renderer delivery and focus failures during window shutdown, and coalesced icon refreshes. Icon loading now releases its gate after persistence failures and avoids late writes during shutdown.
- Prevented output-display callback failures from escaping repeatedly for each process output chunk. Package operations still wait for the actual process result and retain the display warning in Activity.
- Added bounded, local main-process error logs under the application data folder. Logging failures cannot create another application error; logs are not uploaded.
- Made hidden Electron QA processes fail promptly on unexpected exceptions or rejections instead of opening native error dialogs. Two deliberate failure checks verify this behavior.
- The originally reported dialog stack was unavailable. A repeated callback-exception path was reproduced and repaired; this does not establish the precise cause of those earlier dialogs.
- Validation: 70 unit tests, 7 hidden renderer checks, 2 deliberate fatal-error checks, 20 full hidden Electron integration checks and 7 packaged inference/lifecycle checks passed. The packaged workers stopped after approximately 60.7 seconds of idle time. Packaged source matched all 16 application source files.

## 1.2.1 — 2026-10-11

- Fixed incomplete WinGet listings silently dropping package inventory and export entries; unreadable identifiers now preserve the previous complete snapshot and report the problem.
- Preserved favorites, hidden state, tags and recent launches when package and discovery identities merge; ambiguous installations remain separate.
- Merged unique manual/watched executable duplicates without losing package associations or personal organization.
- Retained cached apps from unavailable watched folders, displayed source health, prevented unavailable launches and supported recovery on sync.
- Recomputed recreation-plan installed status from the current library.
- Preserved keyboard focus and unfinished input across search and background updates; keyboard inspection moves into details and dialogs have accessible names.
- Revalidated active custom model files before search, with visible bundled fallback, fresh cache identity, and safe handling of persistence failures. Changed bundled files block semantic search until restart.
- Pinned and checksum-verified all four bundled embedding files. Bundled vector cache identity now reflects actual model bytes.
- Replaced the affected optional build-proxy dependency through a scoped override; the refreshed lockfile reports zero known dependency vulnerabilities.
- Added synthetic inventory/model regressions, hidden renderer regressions and a real-inference changed-model fallback check. No desktop-control testing is used.
- Validation: 60 unit tests, 7 hidden synthetic renderer checks, 20 full hidden Electron integration checks, 7 real model-swap checks, and 7 packaged inference/lifecycle checks passed. Packaged model processes released memory after approximately 60 seconds of idle time. Dependency audit reported zero vulnerabilities.

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
