function renderModelsContent() {
  const host = $('#local-models'), m = state.models;
  if (!host) return;
  if (!m) { host.innerHTML = '<section class="panel"><h2>Local models</h2><p>Loading model settings…</p></section>'; return; }
  const profiles = m.profiles || [];
  if (!modelDraft) modelDraft = {...m.active, threads: m.settings?.threads || 4, context: m.settings?.context || 8192, queryPrefix: m.settings?.queryPrefix || '', documentPrefix: m.settings?.documentPrefix || ''};
  for (const role of ['embedding', 'reasoning']) if (modelDraft[role] !== 'off' && !profiles.some(p => p.id === modelDraft[role])) modelDraft[role] = m.active[role];
  if (modelDraft.chat && !profiles.some(p => p.id === modelDraft.chat)) modelDraft.chat = m.active.chat || null;
  const busy = modelPending || m.busy, open = host.querySelector('details')?.open, off = busy ? 'disabled' : '';
  const size = n => n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : Math.round(n / 1048576) + ' MB';
  const about = p => {
    if (!p) return '';
    const test = p.lastTest, checked = !test ? 'Not checked yet' : (test.ok ? 'Check passed' : 'Check failed') + (test.elapsedMs ? ' in ' + (test.elapsedMs / 1000).toFixed(1) + ' s' : '') + (!test.ok && test.message ? ' · ' + esc(test.message) : '');
    return [p.builtin ? 'Bundled with AppHub' : esc(p.location || 'Added by you'), p.bytes ? size(p.bytes) : '', checked].filter(Boolean).join(' · ');
  };
  const option = (p, role) => `<option value="${esc(p.id)}" ${modelDraft[role] === p.id ? 'selected' : ''}>${esc(p.name)}${m.active[role] === p.id ? ' · In use' : ''}</option>`;
  const removable = p => p && !p.builtin && !Object.values(m.active).includes(p.id) ? `<button class="text-button" data-model-remove="${esc(p.id)}" ${off}>Remove from list</button>` : '';
  const row = (role, title, text, select, info, actions, extra = '') => `<div class="model-row"><div class="model-what"><label for="model-${role}">${title}</label><small>${text}</small></div>`
    + `<div class="model-pick"><select id="model-${role}" ${off}>${select}</select>${info ? `<small class="model-info">${info}</small>` : ''}<div class="model-actions">${actions}</div>${extra}</div></div>`;

  const embedding = profiles.find(p => p.id === modelDraft.embedding), reasoning = profiles.find(p => p.id === modelDraft.reasoning), chatModel = profiles.find(p => p.id === modelDraft.chat);
  const searchName = m.active.reasoning === 'off' ? '' : profiles.find(p => p.id === m.active.reasoning)?.name || '';
  const chatSame = (modelDraft.chat || null) === (m.active.chat || null);
  // The larger chat model is offered where it is used. Once downloaded it is an ordinary entry in the list above it.
  const offers = (m.downloads || []).map(d => {
    const now = m.downloading?.id === d.id ? m.downloading : null;
    if (now) return `<div class="model-offer"><div><strong>${esc(d.name)}</strong><small>${esc(now.stage)} · ${size(now.received)} of ${size(now.total)}</small><div class="bar"><i style="width:${Math.round(now.received / now.total * 100)}%"></i></div></div><button class="button subtle" data-download-cancel>Pause</button></div>`;
    if (d.profile) return m.active.chat === d.profile ? '' : `<button class="text-button" data-download-remove="${esc(d.id)}" ${off}>Delete the ${esc(d.name)} download</button>`;
    return `<div class="model-offer"><div><strong>${esc(d.name)}</strong><small>${d.fits ? `Fuller answers, and better with long questions. Replies take about twice as long and it uses about 6 GB of memory while loaded. ${size(d.bytes)} download.` : `Needs a PC with ${d.memoryGb} GB of memory.`}</small></div><button class="button subtle" data-download="${esc(d.id)}" ${busy || !d.fits ? 'disabled' : ''}>Download</button></div>`;
  }).join('');
  const tuning = [['threads', 'CPU threads', [1, 2, 4, 6, 8]], ['context', 'Context size', [2048, 4096, 8192]]]
    .map(([key, label, values]) => `<label>${label} <select id="model-${key}" ${off}>${values.map(n => `<option ${+modelDraft[key] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`).join('');
  const prefixes = ['queryPrefix', 'documentPrefix']
    .map(key => `<label class="model-prefix">${key === 'queryPrefix' ? 'Search prefix' : 'Document prefix'} <input id="model-${key}" class="text-input" maxlength="100" value="${esc(modelDraft[key])}" ${off}></label>`).join('');

  host.innerHTML = '<section class="panel models-panel"><h2>Local models</h2><p>Each job has its own model. A replacement is tested first, and the current one stays in use if the test fails.</p>'
    + row('embedding', 'Finding apps', 'Matches what you type to apps and settings by meaning.', profiles.filter(p => p.role === 'embedding').map(p => option(p, 'embedding')).join(''), about(embedding),
      `<button class="button subtle" data-model-use="embedding" ${off}>Test &amp; use</button><button class="text-button" data-model-add="embedding" ${off}>Add a model folder…</button>${removable(embedding)}`)
    + row('reasoning', 'Understanding searches', 'Reads a described task and lists the entries that fit.', `<option value="off" ${modelDraft.reasoning === 'off' ? 'selected' : ''}>Off</option>` + profiles.filter(p => p.role === 'reasoning').map(p => option(p, 'reasoning')).join(''),
      reasoning ? about(reasoning) : 'Matching by meaning still works with this off.',
      `<button class="button subtle" data-model-use="reasoning" ${off}>${modelDraft.reasoning === 'off' ? 'Turn off' : 'Test &amp; use'}</button><button class="text-button" data-model-add="reasoning" ${off}>Add a GGUF file…</button>${removable(reasoning)}`)
    + row('chat', 'Chat', 'Answers questions about your apps and this PC.', `<option value="" ${!modelDraft.chat ? 'selected' : ''}>Same as search${searchName ? ' (' + esc(searchName) + ')' : ''}${!m.active.chat ? ' · In use' : ''}</option>` + profiles.filter(p => p.role === 'reasoning').map(p => option(p, 'chat')).join(''),
      chatModel ? about(chatModel) : 'Chat shares the model that understands searches.',
      `<button id="chat-model-use" class="button subtle" ${busy || chatSame ? 'disabled' : ''}>${modelDraft.chat ? 'Test &amp; use' : 'Use the search model'}</button><button id="chat-model-add" class="text-button" ${off}>Add a GGUF file…</button>`, offers)
    + `<div class="notice ${modelError || m.warning ? 'warn' : ''}" role="status" aria-live="polite" ${modelError || m.warning || m.message || busy ? '' : 'hidden'}>${esc(modelError || m.warning || m.message || (busy ? 'Checking compatibility…' : ''))}</div>`
    + `<details ${open ? 'open' : ''}><summary>Advanced</summary><div class="model-tuning">${tuning}<small>Applied the next time a search or chat model is tested.</small></div>`
    + `<p>A model for finding apps is a local Transformers.js folder with config, tokenizer and ONNX files that supports feature extraction with mean pooling. The other two take a GGUF file with a chat template that fits this PC’s memory. Larger context sizes need more memory. Removing an entry leaves its files on your PC.</p>${prefixes}<p>Leave prefixes empty unless the model for finding apps requires them, such as E5’s query: and passage: prefixes.</p>`
    + `<button id="models-reset" class="button subtle" ${off}>Reset to bundled models</button></details></section>`;

  for (const role of ['embedding', 'reasoning']) $('#model-' + role).onchange = e => { modelDraft[role] = e.target.value; modelError = ''; renderModels(); };
  $('#model-chat').onchange = e => { modelDraft.chat = e.target.value || null; modelError = ''; renderModels(); };
  $('#chat-model-use').onclick = () => runModelAction(async () => { const r = await api.chatModel(modelDraft.chat || null); modelDraft = null; return r; });
  $('#chat-model-add').onclick = () => runModelAction(async () => {
    const before = new Set(profiles.map(p => p.id)), result = await api.addModel('reasoning');
    if (result) { const p = result.profiles?.find(p => !before.has(p.id)); if (p) modelDraft.chat = p.id; }
    return result;
  });
  for (const key of ['threads', 'context']) $('#model-' + key).onchange = e => modelDraft[key] = +e.target.value;
  for (const key of ['queryPrefix', 'documentPrefix']) $('#model-' + key).oninput = e => modelDraft[key] = e.target.value;
  host.querySelectorAll('[data-model-add]').forEach(b => b.onclick = () => runModelAction(async () => {
    const before = new Set((state.models?.profiles || []).map(p => p.id)), result = await api.addModel(b.dataset.modelAdd);
    if (result) { const p = result.profiles?.find(p => !before.has(p.id)); if (p) modelDraft[p.role] = p.id; }
    return result;
  }));
  host.querySelectorAll('[data-model-use]').forEach(b => b.onclick = () => runModelAction(() => api.activateModel(b.dataset.modelUse, modelDraft[b.dataset.modelUse], {threads: +modelDraft.threads, context: +modelDraft.context, queryPrefix: modelDraft.queryPrefix, documentPrefix: modelDraft.documentPrefix})));
  host.querySelectorAll('[data-model-remove]').forEach(b => b.onclick = () => runModelAction(() => api.removeModel(b.dataset.modelRemove)));
  $('#models-reset').onclick = () => runModelAction(async () => { const r = await api.resetModels(); modelDraft = null; return r; });
  // A download runs in the background, so it does not lock the rest of this panel the way a compatibility check does.
  host.querySelectorAll('[data-download]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    const result = await attempt(() => api.downloadModel(b.dataset.download));
    if (result) { state.models = result; modelDraft = null; toast('The larger model now answers in Chat'); }
    if (view === 'preferences' && !query) renderModels();
  });
  host.querySelector('[data-download-cancel]')?.addEventListener('click', () => api.cancelDownload().catch(() => {}));
  host.querySelectorAll('[data-download-remove]').forEach(b => b.onclick = () => runModelAction(async () => { const r = await api.removeDownload(b.dataset.downloadRemove); modelDraft = null; return r; }));
}
async function runModelAction(action) {
  if (modelPending || state.models?.busy) return;
  modelPending = true; modelError = '';
  renderModels();
  try {
    const result = await action();
    if (result) state.models = result.models || result;
  } catch (e) {
    modelError = cleanError(e);
  } finally {
    modelPending = false;
    if (view === 'preferences' && !query) renderModels();
    updateFooter();
  }
}
function updateModelRuntime() {
  const description = $('#model-description');
  if (description) description.textContent = modelDescription();
  for (const role of ['embedding', 'reasoning']) {
    const runtime = (role === 'embedding' ? state.ai : state.reasoner) || {};
    const title = $(`#${role}-title`), detail = $(`#${role}-runtime`), status = $(`#${role}-runtime-status`);
    if (title) title.textContent = modelName(role);
    if (detail) detail.textContent = (runtime.message || 'Sleeping') + (runtime.pid ? ' · Process ' + runtime.pid : '');
    if (status) status.textContent = statusLabel(runtime.status);
  }
}

