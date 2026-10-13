// Preserve keyboard position and unfinished input during background updates.
function retainFocus(renderView) {
  const active = document.activeElement;
  const scrolls = ['content', 'chat-log', 'details'].map(id => { const el = document.getElementById(id); return el && {id, top: el.scrollTop, pinned: id === 'chat-log' && el.scrollHeight - el.scrollTop - el.clientHeight < 80}; }).filter(Boolean);
  const marker = active && active !== document.body && active !== document.documentElement ? {
    id: active.id, tag: active.tagName, data: {...active.dataset}, card: active.closest('.app-card')?.dataset.id,
    value: active.matches('input:not([type=checkbox]):not([type=radio]),textarea') ? active.value : undefined,
    start: active.selectionStart, end: active.selectionEnd
  } : null;
  renderView();
  for (const scroll of scrolls) { const el = document.getElementById(scroll.id); if (el) el.scrollTop = scroll.pinned ? el.scrollHeight : scroll.top; }
  if (!marker || active.isConnected) return;
  let replacement = marker.id ? document.getElementById(marker.id) : null;
  if (!replacement) {
    const candidates = [...document.querySelectorAll(marker.card ? '.app-card,[data-star],[data-info]' : 'button,input,select,textarea,[tabindex]')];
    replacement = candidates.find(el => el.tagName === marker.tag && Object.entries(marker.data).every(([key, value]) => el.dataset[key] === value) && Object.keys(marker.data).length > 0);
  }
  if (!replacement && marker.card) replacement = $('#app-list .app-card') || $('#search');
  if (marker.data.answerOpen && replacement?.disabled) replacement = [...document.querySelectorAll('[data-answer-inspect]')].find(el => el.dataset.answerInspect === marker.data.answerOpen) || $('#search');
  if (!replacement && (marker.data.answerOpen || marker.data.answerInspect)) replacement = $('#search');
  if (!replacement || replacement.disabled) return;
  if (marker.value !== undefined && replacement.matches('input,textarea')) replacement.value = marker.value;
  replacement.focus({preventScroll: true});
  if (marker.start != null && replacement.setSelectionRange) try { replacement.setSelectionRange(marker.start, marker.end); } catch {}
}
function render() { retainFocus(renderContent); }
function renderLibrary() { retainFocus(renderLibraryContent); }
function renderActivity() { retainFocus(renderActivityContent); }
function renderModels() { retainFocus(renderModelsContent); }
function focusDetails() { ($('#launch:not(:disabled)') || $('#close-detail'))?.focus(); }

function renderNav() {
  const isSearch = !!query.trim();
  const updates = state.items.filter(a => a.available && !a.updateBlocked).length;
  const counts = {all: state.items.filter(a => a.kind === 'app' && !a.hidden).length, updates};
  $('#navigation').innerHTML = nav.map(([group, entries]) => `<div class="nav-group">${group ? `<span class="nav-label">${group}</span>` : ''}${entries.map(([id, symbol, label]) =>
    `<button class="nav-item${view === id && !isSearch ? ' active' : ''}" data-view="${id}">${svg(symbol)}<span class="nav-text">${label}</span>${counts[id] ? `<span class="count${id === 'updates' ? ' attention' : ''}">${counts[id]}</span>` : ''}</button>`).join('')}</div>`).join('');
  $('#preferences').classList.toggle('active', view === 'preferences' && !isSearch);
}

function navigate(v, c = '') {
  if (v !== 'hardware') { clearInterval(hardwareTimer); hardwareTimer = null; }
  menuClose?.();
  if (v !== 'home') { clearInterval(systemTimer); systemTimer = null; }
  if (searching) api.cancelSearch?.().catch(() => {});
  clearTimeout(debounce);
  view = v; category = c; query = ''; $('#search').value = '';
  results = null; selected = null; generation++;
  searching = false; searchWarning = ''; searchAnswer = ''; searchRecommendations = []; searchReasons = new Map(); reasoningWarning = '';
  render();
  $('#content').scrollTop = 0;
  const body = $('#body');
  body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
  if (v === 'chat') $('#chat-input')?.focus();
  if (v === 'startup') loadStartup();
}

function renderContent() {
  updateFooter();
  renderNav();
  const isSearch = !!query.trim();
  const title = isSearch ? `Results for “${query}”` : titles[view] || titles.all;
  $('#body').onclick = null; $('#body').onchange = null;
  const plain = !isSearch && (view === 'home' || view === 'chat');
  $('#content').classList.toggle('chat-mode', !isSearch && view === 'chat');
  $('#page-header').classList.toggle('hidden', !isSearch && view === 'home');
  $('#page-header').innerHTML = `<h1 title="${esc(title)}">${esc(title)}</h1>${view === 'all' && !isSearch ? `<button id="add-app" class="button subtle">${svg('plus')}Add app</button>` : ''}${view === 'chat' && !isSearch && chat.length ? `<button id="new-chat" class="button subtle">${svg('plus')}New chat</button>` : ''}`;
  if (plain && view === 'home') renderHome();
  else if (plain) renderChat();
  else if (isSearch || ['all', 'favorites', 'recent', 'settings'].includes(view)) renderLibrary();
  else if (view === 'updates') renderUpdates();
  else if (view === 'reproduce') renderReproduce();
  else if (view === 'activity') renderActivity();
  else if (view === 'preferences') renderPreferences();
  else if (view === 'discover') renderDiscover();
  else if (view === 'hardware') renderHardware();
  else if (view === 'startup') { renderStartup(); if (!startupItems && !startupError) loadStartup(); }
  renderDetails();
  $('#add-app')?.addEventListener('click', () => attempt(() => api.addApp()));
  $('#new-chat')?.addEventListener('click', newChat);
}

