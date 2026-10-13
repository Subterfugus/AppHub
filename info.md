# AppHub change log

Record user-visible behavior, relevant fixes and validation here for every release. Keep entries free of personal paths, names, machine inventories, credentials and private screenshots.

## 1.8.1 — 2026-10-12

- Upgrading from 1.6.1 or earlier no longer shows "Recovered preferences.json". The saved preferences were intact; they only lacked the update-hold field added in 1.7.0, and filling it in was reported as a recovery, with a backup copy and a notice that stayed until restart. Fields added by a newer version are now filled in quietly. A file that is unreadable or holds invalid values is still backed up and reported.
- Validation: 140 unit tests passed.

## 1.8.0 — 2026-10-12

- Hardware is rebuilt. Six tiles (Processor, Memory, Graphics, Disk, Network, Battery) show the current reading with a one-minute trace; selecting one opens a chart and its details. Programs and This device are separate tabs. Readings update every second instead of every four, and updating no longer redraws the page, so scrolling, hovering and keyboard focus are undisturbed.
- Readings come from one PowerShell session kept open while the page is visible, rather than a new process for every refresh. Processor and memory figures come straight from the app on every tick; Windows counters follow in the background about every 2.5 seconds; component inventory is read once and reused for five minutes. The session closes 20 seconds after the page is left.
- Much more detail is collected: per-thread load and clock speed, process, thread and queue counts, uptime; committed, cached and paged memory, hard faults, page file, module type, speed and whether memory is soldered; graphics load by engine, dedicated and shared memory, whether the adapter shares system memory, driver date; drive type, bus, health, wear, temperature and power-on hours where reported; volume file systems; Wi-Fi standard, band, channel, signal and link rates (never the network name); battery charge or discharge rate, voltage, health against design capacity and cycles; displays, firmware, power plan and Secure Boot.
- Chat receives all of it as a written description that ends with notes on how to read the numbers, so the model can judge the hardware and not only repeat it.
- Programs are grouped by name with a process count, sortable by name, processor or memory. The ten heaviest are shown, and up to 80 on request.
- Chat: the "Checked …" line and the separate Sources & facts panel are replaced by one row of sources under each reply. Selecting a source shows what was given to the model and when.
- Updates: the three controls on every row are replaced by one ⋯ menu (Skip this version, Never update). Held apps move to a collapsed group with Allow again, and no longer count towards the Updates badge. App details has the same menu.
- Settings → Local models is three rows, one for each job (Finding apps, Understanding searches, Chat), each with its model and what it is doing. Tuning, prefixes and reset are under Advanced.
- Home's gauges still use the earlier, lighter collector.
- Validation: 139 unit tests, 30 hidden renderer checks and 23 full hidden Electron integration checks passed, including live hardware collection on Windows. Ending a program was validated through its refusal paths and unit tests, not by ending a real program.

## 1.7.0 — 2026-10-12

- Follow-up network fix: prefer modern Windows adapter discovery so active Wi-Fi adapters omitted by the legacy query still expose download/upload and link-speed readings. Keep the legacy query as a fallback. Verified against the active adapter and 11 focused hardware/lookup tests.
- Added a separate Hardware page with live CPU/per-core, memory/commit, GPU/VRAM, storage, network, battery, process and component details; visible-only refresh and session history graphs. Ask AI uses the same hardware collector. Unsupported temperature/fan sources are explicitly unavailable.
- Chat now exposes timestamped Sources & facts, cached/unavailable/partial status and the exact bounded facts supplied to the model. Refresh recollects the latest reply's evidence and answers again.
- Chat can use an independently selected registered GGUF model, including custom models, while Search retains its own configuration. Failed activation restores the previous selection.
- Added persistent per-package update exclusions and version skips, respected by single updates, bulk updates and Chat suggestions, and retained in export/restore preferences.
- Fixed overlapping model residency with one shared inference lane and actual process-exit barriers. Embedding retrieval unloads before generation; search uses keyword matching while Chat is busy. Exact names/prefixes avoid model startup. Stop and AI-off cancel pending work without late results restarting inference.
- Fixed native shutdown/fallback races, failed download stream handling, lookup freshness and failure reporting, bounded Chat context, and raw process/startup identities behind display labels.
- Validation: 136 unit/IPC tests, 31 hidden renderer checks, 23 full hidden Electron integration checks and 9 packaged lifecycle checks passed, including live Windows hardware collection, hardware-grounded Chat and both 60-second idle exits. Real bundled/custom inference checks observed a maximum of one resident model. Installed-app checks are recorded locally; private reports and inventories are excluded from this repository.

## 1.6.1 — 2026-10-12

- Chat replies are no longer shortened or altered. The repetition guard added in 1.6.0 removed any sentence it had seen before, dropped a leading full stop (".NET Runtime" became "NET Runtime") and split on decimal points. It now leaves a reply exactly as written and acts only when one long sentence appears three times, cutting at the point the repetition began.
- The reply limit is 900 tokens with the default 8192 context (500 with a smaller one), up from 450, so detailed answers finish.
- A reply that does reach the limit says so under the text instead of ending without explanation.
- Validation: 94 unit tests, 17 hidden renderer checks and 22 full hidden Electron integration checks passed. A long event-log answer that previously stopped mid-list was rerun on Qwen3 8B and completed.

## 1.6.0 — 2026-10-12

- Chat looks things up for the question it is asked. Eleven read-only lookups are available: running programs, services, folder sizes, network status, recent crashes and errors, Windows Update history, battery health, installed app sizes, startup entries, hardware details and the WinGet catalog. Keywords choose them; the model chooses when none match. The reply lists what was checked.
- Folder sizes come from robocopy in list-only mode and report totals per folder. File names and contents are never read.
- Chat can offer more actions, always as buttons with a confirmation: Uninstall (WinGet, through the Activity queue), End a running program, Disable a startup entry, Install from the catalog, and Review all updates. Buttons appear only for things the reply names, and the main process checks each request again against the live system.
- Windows components, security software and AppHub itself cannot be ended. Startup entries are switched with the same StartupApproved flag Task Manager uses, for the current user only.
- Uninstall is a new package operation and is also available from an app's details panel.
- Optional larger chat model: Qwen3 8B can be downloaded from Settings, with resume and a pinned SHA256, and is used for Chat only. Search keeps the bundled 4B model, because the larger one roughly doubles the wait.
- The default context size is now 8192 tokens so lookups fit; a saved 4096 setting is raised once.
- Replies that start repeating themselves are cut off instead of running to the token limit.
- Eight new themes: Dusk, Rosewood, Slate, Espresso, Sand, Sage, Blossom and Sky.
- Validation: 93 unit tests, 17 hidden renderer checks and 22 full hidden Electron integration checks passed. Ending a program and disabling a startup entry were validated through their refusal paths and unit tests, not by changing a real program or entry.

## 1.5.2 — 2026-10-12

- The default colour is now a warm pastel peach instead of bright lime, and the Graphite theme uses warm greys to match.
- All accent colours are pastels: Peach, Butter, Rose, Violet, Blue, Teal and Lime. Orange is replaced by Peach.
- The logo, window icon and installer icon are recoloured to peach.
- Validation: 77 unit tests, 16 hidden renderer checks and 21 full hidden Electron integration checks passed.

## 1.5.1 — 2026-10-12

- New logo: an A drawn as a launch chevron over a hub dot. It replaces the letter tile in the title bar, the window and taskbar icon, and the installer. `assets/apphub.svg` is the source; `scripts/make-icon.cjs` renders the PNG and multi-size ICO from it.
- Rebuilt the stylesheet as one system: three corner radii, two shadows, one easing curve and a single type scale, replacing the layered overrides from 1.5.0.
- Toned down decoration: removed the background glow, gradient headline, glowing buttons, pulsing dots, bouncing and rotating hover effects and the staggered tile entrance. Pages fade in once; hover changes colour only.
- Apps without an icon now show their initial on a muted plate in their own hue instead of a bright gradient. Fixed per-app hues not reaching icon plates.
- Chat replies are plain text beside a small AppHub mark, with suggested apps in one bordered list. The empty chat shows four example questions as a list. Removed the example chips from Home.
- The category chips have their own line in Apps, above the count and the sort and layout controls, so they no longer wrap around them.
- Settings: theme swatches fit one row, status labels are capitalised, and the model description matches what the chat model now does.
- Validation: 77 unit tests, 16 hidden renderer checks and 21 full hidden Electron integration checks passed.

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
