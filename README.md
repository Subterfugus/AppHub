# AppHub

A Windows 11 desktop library for applications, software components, portable tools, Steam games, and Windows settings.

## Install

Build the application from source using the steps below. A packaged build produces a two-file offline installer: keep **AppHub Setup 1.2.2.exe** and **apphub-1.2.2-x64.nsis.7z** together, then run the setup. The accompanying package contains both offline models; do not extract it. Setup verifies its checksum. A missing package stops setup without downloading anything. Alternatively run `dist/win-unpacked/AppHub.exe` after building. Allow about 10 GB of free disk space during installation and use a machine with at least 8 GB of available memory; 16 GB or more system memory is recommended for this CPU configuration.

## Use

Open AppHub from the desktop or Start menu. The library refreshes when it starts. Use **Sync library** after adding or removing software. WinGet update information refreshes on first launch and after six hours; **Updates → Check for updates** refreshes it immediately.

- Search by name, partial name, typo, tag, or a task such as **make my screen warmer at night**. Search includes Windows settings.
- Select a card to inspect it; use **Launch app** or **Open setting**. Double-click a card to launch. Some entries are drivers, plugins, runtimes, or background components and have no launch button.
- Star apps and settings to add favorites. Add comma-separated tags in the details panel. Hide entries you do not need to see; **Show hidden** is available when browsing.
- **Updates** reviews available WinGet updates before running installers. **Activity** keeps installer output and results and lets you cancel queued operations. Keep AppHub open while operations are queued or running. If WinGet times out, the installer outcome is marked uncertain and remaining work is canceled. Confirm that the installer has finished, refresh the library, then review any retry.
- **Discover** searches the WinGet community catalog. Inspect package metadata and select **Install application** to start an installation. An install will not silently upgrade an already installed package.
- **Recreate library** exports or imports an AppHub JSON manifest. Review missing packages, choose latest or saved versions, then install selected packages. Restore favorites, hidden entries, and tags separately after installation. Apps outside WinGet remain in a manual checklist.
- **Add application** adds a portable executable. **AppHub settings → Scan portable folder** includes executable files directly inside a selected folder on each sync. Use **Stop scanning** to forget a folder, or **Remove from library** to forget a manually added app; its files remain on disk.

## Keyboard

**Ctrl K** focuses search. **Ctrl Alt Space** brings the running AppHub window forward. **Arrow keys** move between cards. **Enter** or **Space** opens details. **Escape** closes details or clears search.

## Local search

Two bundled models run locally on the CPU: quantized `Xenova/all-MiniLM-L6-v2` retrieves matches using embeddings, and `Qwen3-4B-Q4_K_M` interprets requests of four or more words when there is no strong name match. Qwen explains the best grounded match from the retrieved library; its suggestions never trigger actions. Semantic results appear while it prepares an answer. Each model has a separate process and unloads after 60 seconds of inactivity; the embedding timer is extended when interpretation finishes. Qwen uses a bounded 4096-token context, four CPU threads, and no GPU allocation. The native server binds only to a random loopback port with a random authentication key and no web interface. Closing AppHub or disabling AI also stops the native model process.

MiniLM uses 384 dimensional embeddings alongside name, keyword, and typo matching. Model files are bundled, so searching needs no model download, account, API key, or network connection. After the last completed search, the model process exits after 60 seconds; a later search starts it again. The first search indexes the library and may take longer. Saved vectors make subsequent searches faster. Disable AI in AppHub settings to use name and keyword matching alone.

Your inventory, tags, queries, and vectors stay on this PC. WinGet catalog lookups, update checks, downloads, and installers use the network independently of local search.

## Replace the models

Open **AppHub settings → Your local models**. Matching and interpretation have independent selections. Use **Add local model**, choose its files, then **Test & use**. Adding only registers its location; a real local loading and search check must pass before it becomes active. Failed checks retain your previous selection. **Reset bundled defaults** restores MiniLM and Qwen3 with their original limits. Choose **Off — embeddings only** to skip chat interpretation.

- Matching: choose a local Transformers.js compatible folder containing config.json, tokenizer.json, and ONNX feature-extraction weights under onnx/. Quantized model_quantized.onnx, model.onnx, and model_fp16.onnx are recognized. The model must work with mean pooling. Under **Compatibility details**, set search/document prefixes only when required by that model.
- Interpretation: choose a local GGUF chat model with a chat template supported by the bundled llama.cpp runtime. Choose a quantized model that fits the available CPU memory. CPU threads and context size apply when you test and use that model. Larger context sizes consume more memory. Very large model files and checks without enough free RAM are rejected.

Weights remain where you selected them. Moving, replacing, or deleting a selected custom model causes a fallback to bundled defaults on the next startup; test the replacement again. Removing an inactive profile forgets the reference and leaves its files intact. Embedding vectors use separate caches for model fingerprints and prefixes. Thread/context limits and prefixes are shared settings for their respective roles, so review them when changing models.

Alternative models covered by integration tests: paraphrase-MiniLM-L3-v2 (ONNX q8) and Qwen2.5 1.5B Instruct Q4_K_M (GGUF). These are optional test models, not additional bundled defaults. Passing the check confirms a small test task; it cannot guarantee every model's quality for every request. Download compatible files from their publishers before adding them. AppHub does not download custom models automatically.

## Boundaries

AppHub discovers registered software, Start menu entries, application shortcuts, Store launch entries, WinGet packages, Steam games, and manually selected portable apps/folders. Windows does not expose a complete catalog of every arbitrary executable, plugin, script, or per-language dependency on a disk. Add unregistered tools explicitly. Similar entries are kept separate when their identity cannot be established safely.

WinGet manages only packages it can match to a configured supported source. Other software uses its own updater. Some installers require administrator approval or interaction and can fail in silent mode; Activity reports their output. A saved version must still be available from its source. A manifest does not back up licenses, application data, game files, or actual Windows settings. Hardware-specific settings pages may be unavailable on a given PC.

## Data and removal

Persistent data lives under `%APPDATA%\AppHub`. Open it from AppHub settings. Malformed saved library/preferences/job files are recovered with an exact backup alongside them and a visible warning. Unexpected main-process errors are recorded locally in `logs/main.log`, with one rotated backup. These logs can contain local paths and stay on this PC. Uninstalling the application preserves this folder. Your manifests are saved wherever you choose. AppHub has no telemetry or account system.

## Build from source

Requires Windows 11 x64, Node.js 24 or later, npm, and WinGet (App Installer). From this folder:

```powershell
npm ci
node node_modules/electron/install.js
npm run prepare-model
node scripts/prepare-reasoner.cjs
npm test
npm start
npm run dist
```

The explicit Electron install command is useful on systems where npm install scripts are disabled. Model weights, native binaries, machine inventories, and private test reports are excluded from this repository. `prepare-model` downloads MiniLM and verifies inference; the pinned, checksum-verified `prepare-reasoner.cjs` script restores Qwen and the native runtime. The production search worker disables remote model loading.

See [test/README.md](test/README.md) to prepare the optional model fixtures first. Automated integration: `node scripts/qa-electron.cjs`. Renderer regressions: `node scripts/qa-ui-audit.cjs`. Fatal-error handling: `node scripts/qa-main-errors.cjs`. Packaged search lifecycle: `node scripts/qa-packaged-search.cjs <path-to-dist-win-unpacked>`. These tests use isolated data and hidden application windows; they do not control the desktop. Test reports describe their scope, including which installer operations were simulated.

## References and third-party software

See `THIRD-PARTY.md` and the installed Electron/Chromium license files. Windows setting targets follow [Microsoft's URI reference](https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings). Package management uses [WinGet](https://learn.microsoft.com/en-us/windows/package-manager/). The local models are [MiniLM](https://huggingface.co/Xenova/all-MiniLM-L6-v2) and [Qwen3 4B](https://huggingface.co/Qwen/Qwen3-4B-GGUF). Qwen runs using [llama.cpp](https://github.com/ggml-org/llama.cpp).

## Changes and privacy

See [info.md](info.md) for release history. [PRIVACY.md](PRIVACY.md) describes local data and what is excluded from this public repository. Build outputs are written to dist/ and QA artifacts to qa-output/; both are ignored.
