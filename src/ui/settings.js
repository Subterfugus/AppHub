const statusLabel = status => { const s = String(status || 'sleeping'); return s[0].toUpperCase() + s.slice(1); };
function runtimeRow(role) {
  const runtime = (role === 'embedding' ? state.ai : state.reasoner) || {};
  return `<div class="setting-row"><div><strong id="${role}-title">${esc(modelName(role))}</strong><small id="${role}-runtime">${esc(runtime.message || 'Sleeping')}${runtime.pid ? ' · Process ' + runtime.pid : ''}</small></div><span id="${role}-runtime-status" class="pill">${esc(statusLabel(runtime.status))}</span></div>`;
}
function renderPreferences() {
  const folders = state.prefs.folders || [];
  const unavailable = folder => state.sourceHealth?.find(h => h.type === 'portable-folder' && h.path === folder)?.status === 'unavailable';
  $('#body').innerHTML = warningNotices()
    + `<div class="panel"><h2>Appearance</h2><div class="swatches" role="radiogroup" aria-label="Theme">${THEMES.map(t =>
      `<button class="swatch${theme === t.id ? ' active' : ''}" role="radio" aria-checked="${theme === t.id}" tabindex="${theme === t.id ? '0' : '-1'}" data-theme-choice="${t.id}"><span class="swatch-preview${t.colors ? '' : ' system'}" style="${t.colors ? `background:${t.colors[0]};color:${t.colors[2]}` : ''}"><i style="${t.colors ? `background:${t.colors[1]}` : ''}"></i>Aa</span>${t.name}</button>`).join('')}</div>`
    + `<div class="accents" role="radiogroup" aria-label="Accent colour"><span>Accent</span>${ACCENTS.map(([id, label, color], i) => i ? [id, label, color] : [id, THEMES.find(t => t.id === theme)?.accent ? 'Theme colour' : label, THEMES.find(t => t.id === theme)?.accent || color]).map(([id, label, color]) =>
      `<button class="accent-dot${accent === id ? ' active' : ''}" role="radio" aria-checked="${accent === id}" tabindex="${accent === id ? '0' : '-1'}" data-accent-choice="${id}" title="${label}" aria-label="${label}" style="background:${color}"></button>`).join('')}</div></div>`
    + `<div class="panel"><h2>Local AI</h2><p id="model-description">${esc(modelDescription())}</p>`
    + `<label class="setting-row"><div><strong>Use local AI</strong><small>AI helps find apps and answers in Chat. One model runs at a time, and unloads after 60 seconds idle.</small></div><input id="ai-toggle" class="switch" type="checkbox" ${state.prefs.aiEnabled !== false ? 'checked' : ''}></label>`
    + `<label class="setting-row"><div><strong>Use the graphics card</strong><small>Runs the chat model on the GPU through Vulkan, which is usually several times faster. If the GPU cannot load it, AppHub uses the CPU instead.</small></div><input id="gpu-toggle" class="switch" type="checkbox" ${state.prefs.gpu !== false ? 'checked' : ''}></label>`
    + runtimeRow('embedding') + runtimeRow('reasoning') + '</div>'
    + '<div id="local-models"></div>'
    + '<div class="panel"><h2>Library sources</h2><p>AppHub reads the Windows registry, Start menu, shortcuts, Store entries, WinGet and Steam. Add anything those miss.</p>'
    + `<button id="prefs-add" class="button subtle">${svg('plus')}Add an app…</button><button id="prefs-folder" class="button subtle">${svg('folder')}Add a folder…</button>`
    + (folders.length ? `<div class="folder-list"><small>Folders scanned on sync (top level only)</small>${folders.map(folder => `<div class="watched-folder"><span>${esc(folder)}${unavailable(folder) ? '<small> · Unavailable — reconnect and sync to retry</small>' : ''}</span><button class="text-button" data-remove-folder="${esc(folder)}">Stop scanning</button></div>`).join('')}</div>` : '')
    + '</div>'
    + `<div class="panel"><h2>Data</h2><p>Your library, preferences, search index and package history are stored on this PC. There is no account and no telemetry.</p><button id="open-data" class="button subtle">${svg('folder')}Open data folder</button><small class="path">${esc(state.dataDirectory || '')}</small></div>`
    + `<p class="footnote">AppHub ${esc(state.appVersion || '1.0.0')}</p>`;
  renderModels();
  document.querySelectorAll('[data-remove-folder]').forEach(b => b.onclick = () => attempt(() => api.removeFolder(b.dataset.removeFolder)));
  document.querySelectorAll('[data-theme-choice]').forEach(b => b.onclick = () => { theme = b.dataset.themeChoice; store('theme', theme); applyAppearance(); render(); });
  document.querySelectorAll('[data-accent-choice]').forEach(b => b.onclick = () => { accent = b.dataset.accentChoice; store('accent', accent); applyAppearance(); render(); });
  $('#body').querySelectorAll('[role=radiogroup]').forEach(group => group.onkeydown = e => {
    const choices = [...group.querySelectorAll('[role=radio]')], index = choices.indexOf(e.target);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? choices.length - 1 : (index + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + choices.length) % choices.length;
    choices[next].focus({preventScroll: true}); choices[next].click();
  });
  $('#ai-toggle').onchange = e => attempt(() => api.setAI(e.target.checked));
  $('#gpu-toggle').onchange = e => attempt(() => api.setGpu(e.target.checked));
  $('#prefs-add').onclick = () => attempt(() => api.addApp());
  $('#prefs-folder').onclick = () => attempt(() => api.addFolder());
  $('#open-data').onclick = () => attempt(() => api.openData());
}

