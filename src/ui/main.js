$('#modal').addEventListener('cancel', () => { modalGeneration++; });
document.addEventListener('click', e => { const close = e.target.closest('[data-dismiss]'); if (close) { dismissed.add(close.dataset.dismiss); render(); } });

let debounce;
$('#search').oninput = () => {
  if (searching) api.cancelSearch?.().catch(() => {});
  clearTimeout(debounce);
  query = $('#search').value.trim();
  const seq = ++generation;
  searching = !!query.trim();
  searchWarning = ''; searchAnswer = ''; searchRecommendations = []; searchReasons = new Map(); reasoningWarning = '';
  results = searching ? [] : null;
  selected = null;
  render();
  if (!searching) return;
  const q = query;
  let semanticFinished = false;
  api.search(q, false)
    .then(r => { if (seq === generation && !semanticFinished) { results = r.items; renderLibrary(); } })
    .catch(e => { if (seq === generation && !semanticFinished) toast(cleanError(e), true); });
  debounce = setTimeout(async () => {
    try {
      const r = await api.search(q, true);
      if (seq !== generation) return;
      semanticFinished = true; searching = false;
      results = r.items;
      searchWarning = r.warning || '';
      searchAnswer = typeof r.answer === 'string' ? r.answer : '';
      searchRecommendations = Array.isArray(r.recommendations) ? [...new Set(r.recommendations.filter(id => typeof id === 'string'))].slice(0, 4) : [];
      searchReasons = new Map((Array.isArray(r.matches) ? r.matches : []).filter(m => m && typeof m.id === 'string' && typeof m.reason === 'string').map(m => [m.id, m.reason]));
      reasoningWarning = r.reasoningWarning || '';
      if (r.ai) state.ai = r.ai;
      if (r.reasoner) state.reasoner = r.reasoner;
      renderLibrary();
      updateFooter();
    } catch (e) {
      if (seq !== generation) return;
      searching = false;
      searchWarning = 'Local AI search is unavailable';
      renderLibrary();
      toast(cleanError(e), true);
    }
  }, 300);
};
$('#search').onkeydown = e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); $('#app-list .app-card')?.focus(); }
  if (e.key === 'Enter') { e.preventDefault(); const a = query && visibleItems()[0]; if (a) activate(a.id); }
};

$('#refresh').innerHTML = svg('sync') + '<span>Sync</span>';
$('#preferences').innerHTML = svg('gear') + '<span class="nav-text">Settings</span>';
$('#navigation').onclick = e => { const b = e.target.closest('[data-view]'); if (b) navigate(b.dataset.view); };
$('#preferences').onclick = () => navigate('preferences');
$('#ai-status').onclick = () => navigate('preferences');
$('#job-status').onclick = () => navigate('activity');
$('#refresh').onclick = () => attempt(async () => { await api.scan(); toast('Library synced'); });
for (const a of ['minimize', 'maximize', 'close']) $('#' + a).onclick = () => api.windowAction(a);

document.addEventListener('keydown', e => {
  if (!$('#modal').open && (e.ctrlKey || e.metaKey) && ['k', 'f'].includes(e.key.toLowerCase())) { e.preventDefault(); $('#search').focus(); $('#search').select(); }
  if (e.key === 'Escape') {
    if ($('#modal').open) { e.preventDefault(); closeModal(); }
    else if (selected) $('#close-detail').click();
    else if (query) { $('#search').value = ''; $('#search').dispatchEvent(new Event('input')); }
  }
});

api.onChange(data => {
  if (data.searchPreview) {
    if (data.searchPreview.query === query && searching) { results = data.searchPreview.items; renderLibrary(); }
    return;
  }
  if (data.chatDelta) {
    if (chatBusy && typeof data.chatDelta.text === 'string') { chatStream = data.chatDelta.text; updateChatStream(); }
    return;
  }
  if (data.chatStatus) {
    if (chatBusy && typeof data.chatStatus.text === 'string') { chatStatus = data.chatStatus.text; updateChatStatus(); }
    return;
  }
  if ('chatEngine' in data) { state.chatEngine = data.chatEngine; updateFooter(); if (!data.ai && !data.reasoner && !data.models && !data.items) return; }
  if (data.focusSearch) { $('#search').focus(); return; }
  if (data.error) { toast(data.error, true); return; }
  if (data.models) state.models = data.models;
  if (data.ai || data.reasoner) {
    if (data.ai) state.ai = data.ai;
    if (data.reasoner) state.reasoner = data.reasoner;
    updateFooter();
    if (view === 'preferences' && !query) { updateModelRuntime(); if (data.models) renderModels(); }
    return;
  }
  if (data.models) {
    if (view === 'preferences' && !query) renderModels();
    updateFooter();
    return;
  }
  if (data.jobUpdate) {
    const j = state.jobs.find(j => j.id === data.jobUpdate.id);
    if (j) Object.assign(j, data.jobUpdate);
    updateJobStatus();
    if (view === 'activity' && !query) renderActivity();
    return;
  }
  state = {...state, ...data};
  if (results) {
    const lookup = new Map(state.items.map(a => [a.id, a]));
    results = results.filter(a => lookup.has(a.id)).map(a => ({...a, ...lookup.get(a.id)}));
  }
  render();
});
attempt(async () => { state = await api.snapshot(); render(); });
