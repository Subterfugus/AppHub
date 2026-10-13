# AppHub

A Windows 11 desktop library for applications, software components, portable tools, Steam games, and Windows settings.

## Install

Build the application from source using the steps below. A packaged build produces a two-file offline installer: keep **AppHub Setup 1.7.0.exe** and **apphub-1.7.0-x64.nsis.7z** together, then run the setup. The accompanying package contains both offline models; do not extract it. Setup verifies its checksum. A missing package stops setup without downloading anything. Alternatively run `dist/win-unpacked/AppHub.exe` after building. Allow about 10 GB of free disk space during installation and use a machine with at least 8 GB of available memory; 16 GB or more system memory is recommended. A graphics card with Vulkan support makes the chat model several times faster but is not required.

## Use

Open AppHub from the desktop or Start menu. The library refreshes when it starts. Use **Sync** in the status bar after adding or removing software. WinGet update information refreshes on first launch and after six hours; **Updates → Check for updates** refreshes it immediately.

- **Home** shows an ask box, live memory, storage and processor gauges, your favorites and recently opened apps. Click a gauge to ask about it.
- **Hardware** has a dedicated monitor for CPU and per-core load, RAM and committed memory, GPU and VRAM, disk space and activity, network throughput, battery, running programs and component inventory. It refreshes every four seconds while visible and keeps up to 60 samples of history in memory. **Ask AI** brings the hardware facts into Chat. Temperature and fan readings appear only when an already-running LibreHardwareMonitor or OpenHardwareMonitor exposes supported sensors; missing readings are marked unavailable.
- **Chat** answers questions about your apps and this PC, looks things up when a question needs them, and offers buttons for what it suggests. See Local chat below.
- Search by name, partial name, typo, tag, or a task such as **make my screen warmer at night**. Search includes Windows settings.
- Click an app or setting to open it. Use its **⋯** button or right-click for details. Entries with nothing to launch, such as drivers, plugins, runtimes, or background components, show their details instead. Filter apps by category with the chips above the grid, and switch between grid and list layouts.
- Star apps and settings to add favorites. Add comma-separated tags in the details panel. Hide entries you do not need to see; **Show hidden** is available when browsing.
- **Updates** reviews available WinGet updates before running installers. **Activity** shows which package a running operation is on, keeps installer output and results, lets you cancel queued operations, and offers **Stop after this package** for a running one. Packages install one at a time and most installers ask for administrator approval; if an operation seems idle, look for a Windows permission prompt in the taskbar. Keep AppHub open while operations are queued or running. If WinGet times out, the installer outcome is marked uncertain and remaining work is canceled. Confirm that the installer has finished, refresh the library, then review any retry.
- In **Updates** or app details, **Exclude from updates** blocks upgrades until cleared, and **Skip version** blocks only the displayed version. A later version becomes eligible automatically. Individual update buttons and Chat actions respect these preferences. Exports retain the preferences for restore.
- **Install apps** searches the WinGet community catalog. View a package's metadata and select **Install** to start an installation. An install will not silently upgrade an already installed package.
- **Export & restore** exports or imports an AppHub JSON manifest. Review missing packages, choose latest or saved versions, then install selected packages. Restore favorites, hidden entries, tags and update preferences separately after installation. Apps outside WinGet remain in a manual checklist.
- **Add app** adds a portable executable. **Settings → Add a folder** includes executable files directly inside a selected folder on each sync. Use **Stop scanning** to forget a folder, or **Remove from library** to forget a manually added app; its files remain on disk.

## Appearance

**Settings → Appearance** offers seventeen themes, ten dark and six light plus System, which follows the Windows app mode, and seven pastel accent colours. The choice is stored on this PC.

## Keyboard

**Ctrl K** focuses search. **Ctrl Alt Space** brings the running AppHub window forward. **Arrow keys** move between apps. **Enter** opens the focused app, or the top result when typing in search. **Space** opens details. **Escape** closes details or clears search.

## Local chat

Chat runs on this PC. Every message comes with a read-only snapshot: Windows version and uptime, processor and load, memory, graphics adapters, drive space, battery, the programs using the most memory and CPU, the programs that start with Windows, counts of your library by category, available updates, and the library entries closest to your message.

When a question needs more, AppHub runs up to three read-only lookups for it and shows which ones under the reply:

- running programs, with the ones that are not responding
- Windows services from installed software
- folder sizes in your user profile, app data and program folders
- network adapters, Wi-Fi, addresses, DNS and VPN
- crashes, freezes, unexpected shutdowns and errors from the Windows event log for the last 7 days
- Windows Update history and whether a restart is pending
- battery wear and charge cycles, where the PC reports them
- installed app sizes and install dates
- registered startup entries (enabled state is checked by the startup lookup)
- hardware: the shared monitor snapshot, including CPU, memory, graphics, disks, network, battery, processes and component inventory
- the WinGet catalog, when you ask for software you do not have

Expand **Sources & facts** beneath a reply to inspect the facts supplied to the model, collection times, cached data, unavailable sources and any truncation. **Refresh** on the latest completed reply collects fresh facts and answers again. Hardware questions use the same collector as the Hardware page; a reply is a timestamped snapshot rather than a continuously updated diagnosis.

Keywords in the message choose the lookups; when none match, the chat model picks. Folder lookups report sizes only: AppHub never opens your files or lists their names. A catalog lookup asks WinGet, which uses the network like **Install apps** does; everything else stays on the PC.

The model cannot run anything. It replies with text and names buttons, and AppHub shows a button only for something that exists and that the reply names. Each button opens a confirmation first:

- **Open**, **Update…** and **Review all…** for library entries and their updates
- **Uninstall…** runs the WinGet uninstaller through the Activity queue, or opens Windows' Installed apps page for apps WinGet does not manage. It is also in an app's details panel.
- **End…** closes a running program. AppHub refuses its own processes and recognized protected Windows or security process names.
- **Disable…** stops a program starting with Windows, the same way Task Manager does. The entry stays in place and can be switched back on in Windows Settings › Apps › Startup. Entries that apply to all users are changed there too.
- **Install…** shows the WinGet package details before anything is installed.

Replies stream as they are written, **Stop** ends one early, and **New chat** clears the conversation. Conversations are kept in memory only and are gone when AppHub closes. Small local models make mistakes, so treat replies as a starting point.

### Larger chat model

**Settings → Local models** offers Qwen3 8B (Q4_K_M, 4.7 GB) as an optional download for Chat. It gives fuller answers and follows longer questions better; replies take about twice as long and it uses about 6 GB of memory while loaded. Search keeps its selected interpretation model. AppHub unloads the previous model before loading the next, so switching between Search and a separate Chat model can add loading time. The download needs a PC with 16 GB of memory, comes from the publisher's repository at a pinned revision, resumes if interrupted, and is checked against a fixed SHA256 before it is used. It then has to pass the same compatibility check as any other model. **Stop using** returns Chat to the bundled model and **Delete** removes the file. This is the only model AppHub ever downloads, and only when you press **Download**.

## Local search

Two bundled models run locally: quantized `Xenova/all-MiniLM-L6-v2` retrieves matches using embeddings, and `Qwen3-4B-Q4_K_M` interprets every search of two or more characters unless it names an app exactly or by prefix. The chat model runs on the graphics card through Vulkan when one is available and on the CPU otherwise; **Settings → Use the graphics card** turns GPU use off. Expect a second or two per answer on a GPU and several seconds on a CPU; name and keyword results appear immediately, and editing the search cancels the pending answer. Qwen lists up to four entries from the retrieved library that are made for the task, each with a reason; its suggestions never trigger actions. Semantic results appear while it prepares an answer. Each recommendation has its own **Open [name]** and **Details** buttons. Buttons use the current library entry; AI text cannot supply a command or URL. Unavailable apps cannot be opened, and entries without a launch target offer inspection. Nothing opens until you click. A shared inference coordinator allows only one resident model at a time: embedding retrieval finishes and its process exits before interpretation or Chat loads. Exact-name and prefix searches skip AI entirely. A search during a Chat reply uses keyword matching until Chat finishes. The last model unloads after 60 seconds of inactivity. Qwen uses a bounded 8192-token context and four CPU threads; with GPU use on, every layer is offloaded, and if the GPU cannot load the model AppHub starts it on the CPU instead. The native server binds only to a random loopback port with a random authentication key and no web interface. Closing AppHub or disabling AI also stops the native model process.

MiniLM uses 384 dimensional embeddings alongside name, keyword, and typo matching. Model files are bundled, so searching and chatting need no model download, account, API key, or network connection. After the last completed search, the model process exits after 60 seconds; a later search starts it again. The first search indexes the library and may take longer. Saved vectors make subsequent searches faster. Disable AI in AppHub settings to use name and keyword matching alone.

Your inventory, tags, queries, and vectors stay on this PC. WinGet catalog lookups, update checks, downloads, and installers use the network independently of local search.

## Replace the models

Open **AppHub settings → Your local models**. Matching, search interpretation and Chat have independent selections. Chat can share the search model or use any registered GGUF profile through its own selector. Independent selections still run one model at a time. Use **Add local model**, choose its files, then **Test & use**. Adding only registers its location; a real local loading and search check must pass before it becomes active. Failed checks retain your previous selection. **Reset bundled defaults** restores MiniLM and Qwen3 with their original limits. Choose **Off — embeddings only** to skip search interpretation; select a separate Chat model to keep Chat available.

- Matching: choose a local Transformers.js compatible folder containing config.json, tokenizer.json, and ONNX feature-extraction weights under onnx/. Quantized model_quantized.onnx, model.onnx, and model_fp16.onnx are recognized. The model must work with mean pooling. Under **Compatibility details**, set search/document prefixes only when required by that model.
- Interpretation: choose a local GGUF chat model with a chat template supported by the bundled llama.cpp runtime. Choose a quantized model that fits the available CPU memory. CPU threads and context size apply when you test and use that model. Larger context sizes consume more memory. Very large model files and checks without enough free RAM are rejected.

Weights remain where you selected them. Moving, replacing, or deleting a selected custom model causes a fallback to bundled defaults on the next startup; test the replacement again. Removing an inactive profile forgets the reference and leaves its files intact. Embedding vectors use separate caches for model fingerprints and prefixes. Thread/context limits and prefixes are shared settings for their respective roles, so review them when changing models.

Alternative models covered by integration tests: paraphrase-MiniLM-L3-v2 (ONNX q8) and Qwen2.5 1.5B Instruct Q4_K_M (GGUF). These are optional test models, not additional bundled defaults. Passing the check confirms a small test task; it cannot guarantee every model's quality for every request. Download compatible files from their publishers before adding them. AppHub does not download custom models; the optional larger chat model above is the one exception, and only on request.

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

See [test/README.md](test/README.md) to prepare the optional model fixtures first. Automated integration: `node scripts/qa-electron.cjs`. Renderer regressions: `node scripts/qa-ui-audit.cjs` and `node scripts/qa-selected-features.cjs`. Fatal-error handling: `node scripts/qa-main-errors.cjs`. Packaged search lifecycle: `node scripts/qa-packaged-search.cjs <path-to-dist-win-unpacked>`. These tests use isolated data and hidden application windows; they do not control the desktop. Test reports describe their scope, including which installer operations were simulated.

## References and third-party software

See `THIRD-PARTY.md` and the installed Electron/Chromium license files. Windows setting targets follow [Microsoft's URI reference](https://learn.microsoft.com/en-us/windows/apps/develop/launch/launch-settings). Package management uses [WinGet](https://learn.microsoft.com/en-us/windows/package-manager/). The local models are [MiniLM](https://huggingface.co/Xenova/all-MiniLM-L6-v2) and [Qwen3 4B](https://huggingface.co/Qwen/Qwen3-4B-GGUF). Qwen runs using [llama.cpp](https://github.com/ggml-org/llama.cpp).

## Changes and privacy

See [info.md](info.md) for release history. [PRIVACY.md](PRIVACY.md) describes local data and what is excluded from this public repository. Build outputs are written to dist/ and QA artifacts to qa-output/; both are ignored.
