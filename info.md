# AppHub change log

Record user-visible behavior, relevant fixes and validation here for every release. Keep entries free of personal paths, names, machine inventories, credentials and private screenshots.

## 1.5.0 — 2026-10-12

- Added **Chat**: ask about your apps and this PC. The local model answers from a read-only snapshot of system information (memory, storage, processor load, graphics, battery, uptime, startup programs, the programs using the most memory and CPU), available updates and the closest library entries. It cannot see files and cannot run anything. Replies stream as they are written and can be stopped.
- Chat replies can offer **Open**, **Update…** and details buttons, limited to library entries that exist and that the reply names. Nothing happens until you click, and updates still open the review dialog.
- Added GPU acceleration. The bundled llama.cpp runtime is now the Vulkan build, which offloads the chat model to the graphics card and falls back to the CPU if the GPU cannot load it. **Settings → Use the graphics card** turns it off. The status bar and Settings show which device is in use.
- Search answers now list up to four recommendations, each with its reason and its own Open and Details buttons. The model rates how well each pick fits, and alternatives are kept only when the task is what the entry is for.
- Added **Home**: an ask box, live memory, storage and processor gauges that open a chat question when clicked, update and app counts, favorites, and recently opened apps. AppHub now opens on Home.
- Restyled the interface: tiles take a tint from their own icon, entries without an icon get a coloured letter, and pages, tiles, the details panel, dialogs and buttons animate. Motion is disabled when Windows asks for reduced motion.
- Validation: 77 unit tests, 16 hidden renderer checks and 21 full hidden Electron integration checks passed, including a real chat reply through IPC with the model on the GPU. Separate real-model checks compared GPU and CPU chat, and confirmed that stopping a reply keeps the model loaded.

## 1.4.0 — 2026-10-12

- Redesigned the interface around launching. Clicking an app or setting opens it; details moved to a **⋯** button, right-click, or Space. Enter opens the focused app, or the top result while typing in search. Entries with nothing to launch still open their details.
- Replaced the large cards, statistics row and page banners with a dense icon grid and a compact list. Category filters are chips above the grid. Layout and sort choices are remembered on this PC.
- Moved search into the title bar. Sync and local AI status are in the status bar. The details panel now overlays the library instead of resizing it.
- Renamed sections to plain labels: Apps, Recent, Install apps, Export & restore, Settings. Removed slogans and repeated privacy statements; the privacy statement appears once, in Settings.
- Added a light theme that follows the Windows app mode. Replaced character glyphs with drawn icons and raised the minimum text size to 12px.
- Added themes (System, Graphite, Midnight, Ocean, Nord, Mocha, Forest, Light, Paper) and six accent colours under Settings → Appearance.
- The interpretation model now reads every search of two or more characters unless it names an app exactly or by prefix. It chooses among up to 16 candidates by name from a shorter prompt. Changing the search cancels the pending answer without unloading the model, so the next search does not reload it.
- Activity shows live progress for a running operation: the package it is on, the stage, and a reminder to look for a Windows permission prompt. Added **Stop after this package**, which lets the current installer finish and skips the rest; the close-window dialog offers the same choice. A status bar indicator shows queue progress from any page.
- Validation: 72 unit tests, 13 hidden renderer checks and 20 full hidden Electron integration checks passed. Renderer and integration checks were updated for the new labels, for Space opening details, and to open details through the details button. A separate real-model check confirmed cancelling during load and mid-answer keeps the same model process.

## 1.3.0 — 2026-10-11

- Added actionable local AI answers: open the recommended app or Windows settings page directly beneath its explanation, or choose View details. Entries without a launch target offer inspection.
- Grounded actions in validated recommendation IDs from the current library, using the existing launch path. Model text cannot supply a command or URL. Search alone does not launch anything or change a Windows setting.
- Cleared actions on new searches, ignored late answers, removed actions for hidden or missing entries, and explained unavailable folders. Pending opens reject duplicate clicks while retaining keyboard focus; launch failures remain visible and can be retried.
- Added hidden renderer regressions for settings/app actions, focus, pending clicks, errors, unavailable entries and stale answers. Full integration checks verify a real local model's Night light recommendation resolves to its exact settings shortcut, with native navigation intercepted for the test.
- Validation: 70 unit tests, 13 hidden renderer checks, 2 deliberate fatal-error checks, 20 full hidden Electron integration checks and 7 packaged inference/lifecycle checks passed. Packaged model processes stopped after approximately 60.7 seconds idle. The final focus adjustment was rechecked with the renderer suite.

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
